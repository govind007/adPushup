const semver = require('semver');
const { engines } = require('../package');
const { exec, execSync } = require('child_process');

// Get NPM Version and run Validation (Node version already available)
exec('npm -v',
  function (error, stdout, stderr) {
    let npmVersion = stdout.replace(/(\r\n|\n|\r)/gm, "");
    runVersionValidation(process.version, npmVersion);
});

function runVersionValidation(nodeVersion, npmVersion) {
  let errCount = 0;

  // Validate NPM Version
  if (!semver.satisfies(npmVersion, engines.npm)) {
    errCount++;
    console.log(`⚠️  The current npm version ${npmVersion} does not satisfy the required version ${engines.npm}. Please upgrade npm or use nvm to change to a newer version of node`)
  }

  // Validate Node Version
  if (!semver.satisfies(process.version, engines.node)) {
    errCount++;
    console.log(`⚠️  The current node version ${nodeVersion} does not satisfy the required version ${engines.node}. Please upgrade node or use nvm to change to a newer version`)
  }

  // Throw error if errCount great than 0
  if(errCount > 0) {
    throw new Error();
  }
}

