const gitHelpers = require('./git-helpers');

const main = async () => {
  if (await gitHelpers.getCurrentBranch() === 'master') {
    console.error('You\'re on the master branch. Master branch is not a hotfix that needs updating!');
    process.exit();
  }

  await gitHelpers.fetchAndIncludeTags();

  if (await gitHelpers.isLatestReleaseTagInCurrentBranch()) {
    console.log('Your hotfix branch is up-to-date!');
  }
  else {
    const latestReleaseTag = await gitHelpers.getLatestReleaseTagInRepo();
    console.log(`Updating your hotfix branch: merging in ${latestReleaseTag}`);
    await gitHelpers.git().raw(['merge', latestReleaseTag, '--no-edit']);
  }
};

main();