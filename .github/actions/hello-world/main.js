const core = require("@actions/core");
const github = require('@actions/github');

// Workflow:
// Get current commit
// Find PR that has as base branch the current branch
// Get target branch of PR
// If current commit can merge easily with target branch, skip workflow
// Otherwise, continue

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
