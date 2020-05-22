const AWS = require('aws-sdk');
const mime = require('mime');
const argv = require('yargs').argv;
const fs = require('fs');
const cmd = require('node-cmd');
const inquirer = require('inquirer');
const chalk = require('chalk');
const gitHelpers = require('./git-helpers');
const { getNextVersion, updateVersion } = require('./utils');
const execSync = require('child_process').execSync;

AWS.events.on('httpError', function () {
  if (this.response.error && this.response.error.code === 'UnknownEndpoint') {
    this.response.error.retryable = true;
  }
});

const getReleaseType = (environment) => {
  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

  if (environment === 'staging' && currentBranch === 'master') {
    return 'staging';
  }
  else if (environment === 'prod' && currentBranch === 'master') {
    return 'release';
  }
  else if (environment === 'prod' && currentBranch && currentBranch !== 'master') {
    return 'hotfix';
  }
}

let version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const action = process.argv[2];
const env = argv.env;
const bucket = env === 'prod' ? 'read.activelylearn.com' : 'altestal.activelylearn.com';
const cloudfrontDistributionId = env === 'prod' ? 'E3CZ8J9MSY30G0': 'E1QMADTW513OGQ';
const releaseType = getReleaseType(env);

if (!releaseType) {
  console.log('Empty releaseType!');
  process.exit(1);
}

let nextversion = getNextVersion({ currentVersion: version, releaseType });

// S3 File MetaData options
const jsUTF8 = { ContentType: 'application/javascript;charset=UTF-8' };
const noCache = { CacheControl: 'no-cache, no-store, must-revalidate' };

console.log(action, env, releaseType, version, nextversion);

let files = [
  { baseDir: 'dist/', source: 'js/account-built.js', extraS3Params: jsUTF8 },
  { baseDir: 'dist/', source: 'js/vendor-built.js', extraS3Params: jsUTF8 },
  { baseDir: 'dist/', source: 'js/main-built.js', extraS3Params: jsUTF8 },
  { baseDir: 'dist/', source: 'js/libs-built.js', extraS3Params: jsUTF8 },
  { baseDir: 'dist/', source: 'js/browsersupport.js' },
  { baseDir: 'dist/', source: 'js/loadingPage.js' },
  { baseDir: 'dist/', source: 'js/ieSupportPolyfill.js' },
  { baseDir: 'dist/', source: 'js/libs/bowser.min.js' },
  { baseDir: 'dist/', source: 'js/libs/pdf/pdf.min.js' },
  { baseDir: 'dist/', source: 'js/libs/pdf/pdf_viewer.min.js' },
  { baseDir: 'dist/', source: 'js/libs/pdf/pdf.worker.min.js' },
  { baseDir: 'dist/', source: 'css/global.css' },
  { baseDir: 'dist/', source: 'css/browserblock.css' },
  { baseDir: 'dist/', source: 'css/algoliainstantsearch.css' },
  { baseDir: 'dist/', source: 'conference.html' },
  { baseDir: 'dist/', source: 'diagnose.html' },
  { baseDir: 'dist/', source: 'favicon-16x16.png' },
  { baseDir: 'dist/', source: 'favicon-32x32.png' },
  { baseDir: 'dist/', source: 'favicon.ico' },
  { baseDir: 'dist/', source: 'index-error.html' },
  { baseDir: 'dist/', source: 'index-maintenance.html' },
  { baseDir: 'dist/', source: 'account.html', extraS3Params: noCache },
  { baseDir: 'dist/', source: 'index.html', extraS3Params: noCache },
  { baseDir: 'dist/', source: 'reset.html' },
  { baseDir: 'dist/', source: 'robots.txt', prodOnly: true },
  { baseDir: 'dist/', source: 'version.json' },
  { baseDir: 'dist/', source: 'fonts/icomoon.eot' },
  { baseDir: 'dist/', source: 'fonts/icomoon.ttf' },
  { baseDir: 'dist/', source: 'fonts/icomoon.woff' },
];
const folders = [
  { source: 'extension', dest: 'extension/' },
];

async function main () {
  // ACTIONS =================================
  if (action === 'revert') {
    revert();
  }
  else if (action === 'deploy') {
    const validDeployment = env === 'prod' && await canDeployProd() || env === 'staging' && releaseType === 'staging';

    if (validDeployment) {
      const currentGitBranch = await gitHelpers.getCurrentBranch();
      executeDeployment(currentGitBranch);
    }
    else {
      console.log('Not a valid deployment... Check branch.')
      process.exit(1);
    }
  }
}

async function executeDeployment (currentGitBranch) {
  console.log('\n[' + new Date().toLocaleTimeString() + '] 🚢  Deploying ' + currentGitBranch + ' to ' + env + '\n=================================');

  try {
    const latestReleaseTag = await gitHelpers.getLatestReleaseTagInRepo();

    if (env === 'staging') {
      await prepareStagingRelease();
    }
    else {
      await gitHelpers.git().checkout(latestReleaseTag);

      if (releaseType !== 'hotfix') {
        console.log(chalk.bgGreen('\nStart Backend deployment from Visual Studio! This script will resume in 3 minutes.\n'));
        await wait(3);
      }
    }

    await runBuild();
    await uploadFiles();
    await invalidateCloudfront();

    // Update Raygun deployment for Prod releases
    if (env === 'prod') {
      const latestReleaseTagSHA = await gitHelpers.getLatestReleaseTagCommitSHA(latestReleaseTag);
      return updateRaygunDeployments(latestReleaseTagSHA);
    }

    await updateRaygunSourcemaps();
    await removeVersionedFiles();
  }
  catch (err) {
    console.log('❌  ***ERROR***', err);
    process.exit(1); // Return exit code to ensure CI fails  
  }
};

// DEPLOY HELPERS =================================
const wait = async (minutes) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), 1000 * 60 * minutes);
  });
};

const canDeployProd = async () => {
  if (releaseType === 'staging') {
    return false;
  }
  else {
    await gitHelpers.fetchAndIncludeTags();
    return await gitHelpers.isBranchCleanAndCurrent({ silent: false });
  }
}

async function prepareStagingRelease() {
  return new Promise(function (resolve, reject) {
    console.log('[' + new Date().toLocaleTimeString() + '] ✂️  Preparing staging release');

    cmd.get(`npm run create-staging-release`, function (err, data, stderr) {
      if (err) {
        console.warn(err);
        reject(data);
      }
      else {
        console.log('[' + new Date().toLocaleTimeString() + '] ✅  Succeeded preparing release');
        resolve();
      }
    });
  });
}

function runBuild() {
  return new Promise(function (resolve, reject) {
    console.log('[' + new Date().toLocaleTimeString() + '] 📦  Running webpack');

    cmd.get('npm run build:prod', function (err, data, stderr) {
      if (err) {
        console.warn(err);
        reject(data);
      }
      else {
        console.log('[' + new Date().toLocaleTimeString() + '] ✅  Succeeded Webpacking');
        resolve();
      }
    });
  });
}

function uploadFiles() {
  return new Promise(async function (resolve, reject) {
    let uploadedCount = 0;

    folders.forEach(function (folder) {
      const filesInFolder = [];
      walkSync(folder.source, filesInFolder, folder.ignoreSubDirs || []);
      files = files.concat(filesInFolder.map(url => ({ source: url })));
    });

    if (env != 'prod') {
      files = files.filter(x => x.prodOnly === undefined);
    }

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || AWS.config.credentials.accessKeyId;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || AWS.config.credentials.secretAccessKey;

    console.log('[' + new Date().toLocaleTimeString() + '] ⬆️  Uploading ' + files.length + ' files to S3...');
    const awsS3 = new AWS.S3({
      region: 'us-west-2',
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    });

    for (const file of files) {
      const data = fs.readFileSync(file.baseDir ? file.baseDir + file.source : file.source);
      const buffer = new Buffer.from(data, 'base64');

      await awsS3.putObject({
        Bucket: bucket,
        Key: file.dest ? file.dest : file.source,
        Body: buffer,
        ContentType: mime.getType(file.source, 'application/octet-stream'),
        ...file.extraS3Params,
      }).promise();

      uploadedCount++;

      if (uploadedCount === files.length) {
        if (env === 'staging') {
          // change the version numbers back
          const temp = nextversion;
          nextversion = version;
          version = temp;
          updateVersion(version, nextversion);
        }

        console.log('[' + new Date().toLocaleTimeString() + '] ✅  Succeeded uploading');
        resolve();
      }
    }
  });
}

function invalidateCloudfront() {
  return new Promise(async function (resolve, reject) {
    if (env === 'prod') {
      const cloudfrontParams = {
        DistributionId: cloudfrontDistributionId,
        InvalidationBatch: {
          CallerReference: new Date().toISOString(),
          Paths: {
            Quantity: 2,
            Items: [
              '/index.html',
              '/account.html',
            ]
          }
        }
      };

      console.log('[' + new Date().toLocaleTimeString() + '] ⬆️  Invalidating ' +
        cloudfrontParams.InvalidationBatch.Paths.Quantity + ' files in Cloudfront...');

      const accessKeyId = process.env.AWS_ACCESS_KEY_ID || AWS.config.credentials.accessKeyId;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || AWS.config.credentials.secretAccessKey;
      const cloudfront = new AWS.CloudFront({
        region: 'us-west-2',
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      });

      await cloudfront.createInvalidation(cloudfrontParams).promise();

      console.log('[' + new Date().toLocaleTimeString() + '] ✅  Succeeded invalidating');
    }

    resolve();
  });
}

function updateRaygunSourcemaps() {
  return new Promise(function (resolve, reject) {
    console.log('[' + new Date().toLocaleTimeString() + '] 🔫  Updating Raygun');

    cmd.get('node node_scripts/raygun.js ' + env, function (err, data) {
      if (data.indexOf('error') >= 0) {
        reject(data);
        process.exit(1); // Needed for failing CI environment
      }
      else {
        console.log('[' + new Date().toLocaleTimeString() + '] ✅  Succeeded Raygun-ing (source maps)');
        resolve();
      }
    });
  });
}

function updateRaygunDeployments(gitHash) {
  return new Promise(function (resolve, reject) {
    const token = 'x9E71RVDiRLooZATPrJLflpsLOGZCCZH';
    const email = 'anish@activelylearn.com';
    const name = 'Anish Mehta';
    const apiKeys = {
      frontend: 'uigNErZvFNejNVOjsd1ckw==',
      nodebackend: 'PKS2F6Ht96G2EL/MWkxTJg==',
    };
    let completedCount = 0;

    if (env === 'prod') {
      Object.keys(apiKeys).map((application) => {
        const apiKey = apiKeys[application];
        // NOTE: we're only updating raygun deployments for prod releases
        //       create-release (which updates version # has already happened)
        //       so we use version instead of nextVersion
        const args = `-v '${version}' -t ${token} -a ${apiKey} -e '${email}' -n '${name}' -g '${gitHash}'`;
        const cmdString = `bash ./node_scripts/deployment.sh ${args}`;
        console.log(`DEBUG: ${cmdString}`);
        cmd.get(cmdString, (err, data) => {
          if (data.indexOf('error') >= 0) {
            reject(data);
            process.exit(1); // Needed for failing CI environment
          }
          else {
            completedCount++;
            console.log(`[${new Date().toLocaleTimeString()}] ✅  Succeeded sending deployment info to raygun (${application}): `, JSON.parse(data).url);

            if (completedCount >= Object.keys(apiKeys).length) {
              resolve();
            }
          }
        });
      });
    }
  });
}

// GENERIC HELPERS =================================
function walkSync(dir, filelist, ignoreSubDirs) {
  var fs = fs || require('fs'),
    files = fs.readdirSync(dir);

  filelist = filelist || [];
  files.forEach(function (file) {
    if (fs.statSync(dir + '/' + file).isDirectory()) {
      if (!ignoreSubDirs.includes(file)) {
        filelist = walkSync(dir + '/' + file, filelist);
      }
    }
    else {
      filelist.push(dir + '/' + file);
    }
  });

  return filelist;
};

function removeVersionedFiles() {
  cmd.get('git reset HEAD --hard');
}

async function revert() {
  // just need to permanently delete all the files from bucket and let S3 versioning do the rest
  // http://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectVersioning.html
  console.log('\nReverting ' + env + '\n=================================');
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || AWS.config.credentials.accessKeyId;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || AWS.config.credentials.secretAccessKey;

  const s3 = new AWS.S3({
    region: 'us-west-2',
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey
  });

  const data = await s3.listObjectVersions({ Bucket: bucket, }).promise();
  const filesToRevert = [];

  data.Versions.forEach(function (row) {
    // Checking if the files or folders array contains the current file & if it is the latest version
    const shouldRevertFile = row.IsLatest && (files.some((file) => row.Key.indexOf(file.source) !== -1)
      || folders.some((folder) => row.Key.indexOf(folder.dest) !== -1));

    if (shouldRevertFile) {
      filesToRevert.push({ Key: row.Key, VersionId: row.VersionId });
    }
  });

  const confirmDeleteAnswer = await inquirer.prompt([{
    type: 'input',
    name: 'confirm',
    message: `This will rollback ${filesToRevert.length} files to a prior version (if it exists).\nAre you sure you want to continue (yes/no)?`,
    default: 'No, I want to abort...'
  }]);

  if (confirmDeleteAnswer.confirm === 'yes') {
    console.log(`\nDeleting latest version for ${filesToRevert.length} files...`);

    const params = {
      Bucket: bucket,
      Delete: {
        Objects: filesToRevert,
        Quiet: false,
      }
    };

    try {
      await s3.deleteObjects(params).promise();
      console.log(' ✅  Succeeded'); // successful response
    }
    catch (err) {
      console.log('***ERROR***', err.stack); // an error occurred
      process.exit(1); // Needed for failing CI environment
    }
  }
}

main();
