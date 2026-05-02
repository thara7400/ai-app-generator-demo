import { Octokit } from '@octokit/rest';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import type { AppSpec } from '../types/spec.js';

export class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor() {
    this.octokit = new Octokit({ auth: env.GITHUB_TOKEN });
    const parts = env.GITHUB_REPO.split('/');
    this.owner = parts[0] ?? '';
    this.repo = parts[1] ?? '';
  }

  async pushAndTriggerBuild(
    mainDartContent: string,
    spec: AppSpec,
    projectId: string,
  ): Promise<{ commitSha: string; workflowRunId: number }> {
    logger.info({ projectId, type: spec.type }, 'Pushing to GitHub');

    const { owner, repo, octokit } = this;

    // 1. master ブランチの最新 commit SHA を取得
    const branchData = await octokit.repos.getBranch({ owner, repo, branch: 'master' });
    const latestCommitSha = branchData.data.commit.sha;

    // 2. blob 作成
    const blobData = await octokit.git.createBlob({
      owner,
      repo,
      content: Buffer.from(mainDartContent).toString('base64'),
      encoding: 'base64',
    });
    const blobSha = blobData.data.sha;

    // 3. tree 作成(lib/main.dart のみ更新、既存ファイルは base_tree で引き継ぐ)
    const treeData = await octokit.git.createTree({
      owner,
      repo,
      base_tree: latestCommitSha,
      tree: [{ path: 'lib/main.dart', mode: '100644', type: 'blob', sha: blobSha }],
    });
    const treeSha = treeData.data.sha;

    // 4. commit 作成
    const commitData = await octokit.git.createCommit({
      owner,
      repo,
      message: `[demo] Generate ${spec.type}: ${spec.title} (${projectId})`,
      tree: treeSha,
      parents: [latestCommitSha],
    });
    const newCommitSha = commitData.data.sha;

    // 5. ref 更新(master を新 commit に進める)
    await octokit.git.updateRef({
      owner,
      repo,
      ref: 'heads/master',
      sha: newCommitSha,
    });

    logger.info({ projectId, commitSha: newCommitSha }, 'Push complete and Actions triggered');

    // 6. GitHub 側の indexing 待ち
    await new Promise((r) => setTimeout(r, 2000));

    // 7. 該当 commit_sha の workflow run を取得(最大 3 回リトライ)
    let workflowRunId = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
      const runsData = await octokit.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        head_sha: newCommitSha,
        per_page: 1,
      });
      const run = runsData.data.workflow_runs[0];
      if (run) {
        workflowRunId = run.id;
        break;
      }
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return { commitSha: newCommitSha, workflowRunId };
  }

  async pushWithRetry(
    mainDartContent: string,
    spec: AppSpec,
    projectId: string,
  ): Promise<{ commitSha: string; workflowRunId: number }> {
    const attempts = 2;
    for (let i = 0; i < attempts; i++) {
      try {
        return await this.pushAndTriggerBuild(mainDartContent, spec, projectId);
      } catch (err) {
        if (i === attempts - 1) throw err;
        logger.warn(
          { err: (err as Error).message, attempt: i + 1 },
          'GitHub push failed, retrying in 3s',
        );
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    throw new Error('Unreachable');
  }
}

export const githubService = new GitHubService();
