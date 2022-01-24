const core = require("@actions/core");
const github = require('@actions/github');

const main = async () => {
	const firstGreeting = core.getInput("first-greeting");
	const secondGreeting = core.getInput("second-greeting");
	const thirdGreeting = core.getInput("third-greeting");

	console.log(`Hello ${firstGreeting}`);
	console.log(`Hello ${secondGreeting}`);
	if (thirdGreeting) {
		console.log(`Hello ${thirdGreeting}`);
	}

	const myToken = core.getInput('GITHUB_TOKEN');

    const octokit = github.getOctokit(myToken)

	const { data } = await octokit.rest.pulls.list({
		owner: "utwente-fmt",
		repo: "vercors",
	});

	console.log(data);
};

main();
