const fs = require('fs');
const { argv } = require('yargs');
const gitHelpers = require('./git-helpers');
const { getNextVersion, updateVersion } = require('./utils');

const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const releaseType = argv.type || 'staging';
const silent = argv.silent || false;

const main = async () => {
  try {
    const isValidHotfixRelease = releaseType === 'hotfix' && await gitHelpers.checkHotfixPrerequisites({ silent });
    const isValidSprintRelease = releaseType === 'release' && await gitHelpers.checkSprintPrerequisites({ silent });
    const isValidProdRelease = isValidHotfixRelease || isValidSprintRelease;
    const isValidStagingRelease = !isValidProdRelease && await gitHelpers.getCurrentBranch() === 'master';
    const nextVersion = getNextVersion({ currentVersion: version, releaseType });

    if (isValidProdRelease) {
      await createRelease(nextVersion);
    }
    else if (isValidStagingRelease) {
      // For staging, we just update file version (no release commit or tagging)
      await updateVersion(version, nextVersion);
    }
  }
  catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const createRelease = async (nextVersion) => {
  console.log('\nCutting release!');
  await updateVersion(version, nextVersion);
  await addReleaseCommit(nextVersion);
  await tagReleaseAndPush(nextVersion);
};

const addReleaseCommit = async (nextVersion) => {
  await gitHelpers.git().add('./*');
  await gitHelpers.git().commit(`chore: v${nextVersion} ${releaseType}`);
};

const tagReleaseAndPush = async (nextVersion) => {
  const branchName = await gitHelpers.getCurrentBranch();
  await gitHelpers.git().addAnnotatedTag(`v${nextVersion}`, `v${nextVersion} ${releaseType}`);
  await gitHelpers.git().push('origin', branchName, { '--follow-tags': null })
};

main();