const simpleGit = require('simple-git/promise');
const git = simpleGit;

const fetch = async () => {
  return git().fetch();
}

const fetchAndIncludeTags = async () => {
  return git().fetch({
    '--tags': null,
  });
}

const getCurrentBranch = async () => {
  const status = await git().status();
  return status.current;
}

const getConfigProperty = async (property) => {
  const result = await git().raw(['config', property]);
  // strip leading/trailing spaces/newlines
  return result.replace(/^\s+|\s+$/g, '');
}

const isLatestReleaseTagInCurrentBranch = async () => {
  const currentBranch = await getCurrentBranch();
  const latestReleaseTag = await getLatestReleaseTagInRepo();
  const latestReleaseTagCommitSHA = await getLatestReleaseTagCommitSHA(latestReleaseTag);

  const branchSummary = await git().raw(['branch', currentBranch, '--contains', latestReleaseTagCommitSHA]);
  return !!branchSummary;
}

const getLatestReleaseTagInRepo = async () => {
  const latestTaggedCommitInRepo = (await git().raw(['rev-list', '--tags', '--max-count=1'])).trim();
  return (await (git().raw(['describe', '--tags', latestTaggedCommitInRepo]))).trim();
};

const getLatestReleaseTagCommitSHA = async (latestReleaseTag) => {
  return (await git().raw(['rev-list', '-n 1', latestReleaseTag])).split('\n').shift();
};

const isBranchOutOfDateOrMissingRemote = async () => {
  await fetchAndIncludeTags();
  const status = await git().status();
  return status.ahead !== 0 || status.behind !== 0 || status.tracking === null;
}

const unstagedChangesExist = async () => {
  const status = await git().status();
  const propsToCheck = ['not_added', 'conflicted', 'created', 'deleted', 'modified', 'renamed'];
  return propsToCheck.some(prop => status[prop].length > 0);
};

const checkHotfixPrerequisites = async ({ silent }) => {
  await fetchAndIncludeTags();
  const isFeatureBranch = await getCurrentBranch() !== 'master';
  !silent && console.log(getPassFailIcon(isFeatureBranch) + ' Feature branch');

  return isFeatureBranch && await isBranchCleanAndCurrent({ silent });
};

const checkSprintPrerequisites = async ({ silent }) => {
  await fetchAndIncludeTags();
  const isMasterBranch = await getCurrentBranch() === 'master';
  !silent && console.log(getPassFailIcon(isMasterBranch) + ' Master branch');

  return isMasterBranch && await isBranchCleanAndCurrent({ silent });
};

const isBranchCleanAndCurrent = async ({ silent }) => {
  const isCleanWorkingCopy = !await unstagedChangesExist();
  const isBranchUpToDate = !await isBranchOutOfDateOrMissingRemote();
  const isLatestReleaseInCurrentBranch = await isLatestReleaseTagInCurrentBranch();

  if (!silent) {
    console.log(getPassFailIcon(isBranchUpToDate) + ' Up to date');
    console.log(getPassFailIcon(isCleanWorkingCopy) + ' Clean');
    console.log(getPassFailIcon(isLatestReleaseInCurrentBranch) + ' Latest release in branch');
  }

  return isCleanWorkingCopy && isBranchUpToDate && isLatestReleaseInCurrentBranch;
};

const getPassFailIcon = (booleanValue) => {
  return booleanValue ? '✅' : '❌';
};

module.exports = {
  git,
  fetch,
  fetchAndIncludeTags,
  getCurrentBranch,
  getConfigProperty,
  getLatestReleaseTagInRepo,
  getLatestReleaseTagCommitSHA,
  isLatestReleaseTagInCurrentBranch,
  isBranchCleanAndCurrent,
  isBranchOutOfDateOrMissingRemote,
  unstagedChangesExist,
  checkHotfixPrerequisites,
  checkSprintPrerequisites,
};