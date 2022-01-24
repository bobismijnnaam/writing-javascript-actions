const core = require("@actions/core");
const github = require('@actions/github');

// Workflow:
// Get current commit
// Find PR that has as base branch the current branch
// If mergable, exit
// If not, continue
// If unknown, wait 10 seconds, and try again every second
//
// When multiple commits are pushed, only the latest gets executed in an action. Additionally, it is assumed in this action we are not dealing with technically annoying behaviour, i.e., pushing single branches rapidly. Therefore it is safe to assume that we can wait 10 sec to check if the current branch is mergable. In the worst case, 10 seconds is wasted waiting

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
