const core = require("@actions/core");
const { Octokit } = require("@octokit/action");

const firstGreeting = core.getInput("first-greeting");
const secondGreeting = core.getInput("second-greeting");
const thirdGreeting = core.getInput("third-greeting");

console.log(`Hello ${firstGreeting}`);
console.log(`Hello ${secondGreeting}`);
if (thirdGreeting) {
    console.log(`Hello ${thirdGreeting}`);
}

const octokit = new Octokit();

console.log(octokit.rest.pulls.list({
	owner: utwente_fmt,
	repo: "vercors",
}));
