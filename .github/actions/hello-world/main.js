const core = require("@actions/core");
const github = require('@actions/github');

const process = require('process');
const hrtime = process.hrtime;

/*
Workflow
currentCommit, currentBranch, currentEvent

if currentEvent != push:
	This workflow is allowed to run, because it is not triggered by a push event, but a $currentEvent

startTime = time()

while ((while loop has not been executed yet || there are PRs with mergable not yet set) && time() - startTime < 10)
	prs = getPrs()
	prs = [pr for pr in prs if branch(pr) == currentBranch]

	if exists pr, head(currentBranch) == currentCommit && !mergable(pr)
		This workflow must run, as there is at least one case where the pull_request event does not run because the commit is not mergable

	if all pr, branch(pr) == currentBranch ==>
			head(currentBranch) == currentCommit && mergable(pr)
		This workflow can be safely canceled
	
	sleep(1s)

10s has passed and there are still PRs that have mergable unset
Therefore, we cannot rely on the mergable flag, and let it continue

*/

const secondsToNanos = x => x * 1000000000n; // Returns bigint because of "n" at the end

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function getHeadOf(octokit, owner, repo, branch) {
	const { type: { sha } } = await octokit.rest.git.getRef({
		owner,
		repo,
		ref: "heads/" + branch,
	});
	return sha;
}

const main = async () => {
	const myToken = core.getInput('GITHUB_TOKEN');

    const octokit = github.getOctokit(myToken)

	const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
	const currentBranch = process.env.GITHUB_REF_NAME;
	const eventType = process.env.GITHUB_EVENT_NAME;

	const { data } = await octokit.rest.pulls.list({
		owner, repo
	});

	console.log(data);
	for (const pr of data) {
		const { data } = await octokit.rest.pulls.get({
			owner, repo, pull_number: pr.number
		});
		console.log(data);
	}

	if (eventType != "push") {
		// TODO: Return string or print?
		return;
	}

	console.log(getHeadOf(octokit, "utwente-fmt", "vercors", "dev"));

	let prs = [];
	const start = hrtime.bigint();
	do {
		// If currentCommit is no longer the head of currentBranch: let it run to be safe
		if (getHeadOf(octokit, owner, repo, currentBranch) != currentCommit) {
			// TODO: Print, or return reasoning as string?
			return;
		}

		prs = getPrs(octokit, owner, repo, currentBranch);

		// If exists pr from currentBranch s.t. !mergable(pr): workflow must run
		let allTrue = true;
		for (const pr of prs) {
			// Check if equals to false, since allowed values are: true, false, null
			if (pr.mergable == false) {
				// TODO: Print or return string
				return;
			}
			allTrue = allTrue && (pr.mergable == true);
		}

		// If all PRs are mergable: the push event workflow can be skipped
		if (allTrue) {
			// TODO: Print, return, and/or execute workflow skipping
		}

		await delay(1000);
	} while (existstUnsetMergable(prs) && (hrtime.bigint() - start) < secondsToNanos(10));
};

main();
