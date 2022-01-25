const core = require("@actions/core");
const github = require('@actions/github');

/*
Workflow
currentCommit, currentBranch, currentEvent

if currentEvent != push:
	This workflow is allowed to run, because it is not triggered by a push event, but a currentEvent

prs = getPrs()
prs = [pr for pr in prs if branch(pr) == currentBranch]

while, at least once, there are PRs with mergable not yet set, or 10s have passed:
	if exists pr, head(currentBranch) == currentCommit && !mergable(pr)
		This workflow must run, as there is at least one case where the pull_request event does not run because the commit is not mergable

	if all pr, branch(pr) == currentBranch ==>
			head(currentBranch) == currentCommit && mergable(pr)
		This workflow can be safely canceled
	
	sleep(1s)

At this point, there are commits past currentCommit, so we cannot rely on the mergable flag.
Therefore, when in doubt, we let it continue

*/

const main = async () => {
	const myToken = core.getInput('GITHUB_TOKEN');

    const octokit = github.getOctokit(myToken)

	const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
	const currentBranch = process.env.GITHUB_REF_NAME;
	console.log(currentBranch);
	const eventType = process.env.GITHUB_EVENT_NAME;
	console.log(eventType);

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
};

main();
