const gitHelpers = require('./git-helpers');
const hotfixBranchName = process.argv[2];

if (!hotfixBranchName) {
  console.log('❌ Please specify branch name');
  process.exit();
}

const main = async () => {
  await gitHelpers.fetchAndIncludeTags();
  const latestReleaseTag = await gitHelpers.getLatestReleaseTagInRepo();

  if (!latestReleaseTag) {
    console.log('❌ Could not find latest release tag!');
    process.exit();
  }

  await gitHelpers.git().checkoutBranch(hotfixBranchName, latestReleaseTag)
};

main();