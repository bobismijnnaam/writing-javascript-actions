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
	const { data: { object: { sha }}} = await octokit.rest.git.getRef({
		owner,
		repo,
		ref: "heads/" + branch,
	});
	return sha;
}

async function getPrsOnBranch(octokit, owner, repo, currentBranch) {
	const r = await octokit.rest.pulls.list({
		owner, repo, head: currentBranch
	});
	console.log(r);
	return r.data;
}

async function logic(octokit) {

	const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
	const currentBranch = process.env.GITHUB_REF_NAME;
	const currentCommit = process.env.GITHUB_SHA;
	const eventType = process.env.GITHUB_EVENT_NAME;

	console.log(`Owner: ${owner}
Repo: ${repo}
Current branch: ${currentBranch}
Current commit: ${currentCommit}
Event type: ${eventType}`);

	/*
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
	*/

	if (eventType != "push") {
		return { action: "continue", reason: "Workflow event is not a push event but a " + eventType + ", letting workflow continue"};
	}

	// console.log(await getHeadOf(octokit, "utwente-fmt", "vercors", "dev"));

	let prs = [];
	const start = hrtime.bigint();
	do {
		// If currentCommit is no longer the head of currentBranch: let it run to be safe
		headOfCurrentBranch = await getHeadOf(octokit, owner, repo, currentBranch);
		if (headOfCurrentBranch != currentCommit) {
			return {
				action: "continue",
				reason: `Head of current branch: ${headOfCurrentBranch}
Current commit: ${currentCommit}
The commit for which this workflow runs is no longer the head of the branch. Therefore we let it run to be sure, because checking for a merge conflict manually is hard.` };
		}

		prs = await getPrsOnBranch(octokit, owner, repo, currentBranch);
		console.log(prs);

		if (prs.length == 0) {
			return {
				action: "continue",
				reason: "There are currently no open PRs, so this workflow should run."
			};
		}

		// If exists pr from currentBranch s.t. !mergable(pr): workflow must run
		let allTrue = true;
		for (const pr of prs) {
			// Check if equals to false, since allowed values are: true, false, null
			if (pr.mergable == false) {
				return {
					action: "continue",
					reason: `There is at least one PR that is not mergable: "${pr.title}" (#${pr.id}). Therefore, this workflow needs to run.`
				};
			}
			allTrue = allTrue && (pr.mergable == true);
		}

		// If all PRs are mergable: the push event workflow can be skipped
		if (allTrue) {
			return {
				action: "skip",
				reason: `All PRs that have base branch ${currentBranch} are mergable. This means there are also pull_request events that will run. Therefore, this workflow, triggered by the push event, can be skipped.`
			};
		}

		await delay(1000);
	} while (existstUnsetMergable(prs) && (hrtime.bigint() - start) < secondsToNanos(10));
};

async function main() {
	const myToken = core.getInput('GITHUB_TOKEN');
    const octokit = github.getOctokit(myToken)

	const { action, reason } = await logic(octokit);
	if (action == "continue") {
		console.log(reason);
	} else if (action == "skip") {
		console.log(reason);
		const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
		const workflowRunID = process.env.GITHUB_RUN_ID;
		console.log(`Skipping workflow #${workflowRunID}`);
		console.log(await octokit.rest.actions.cancelWorkflowRun({
			owner,
			repo,
			run_id: workflowRunID
		}));
	} else {
		console.log("Unknown reason: " + reason + ". Letting workflow continue");
	}
}

main();
