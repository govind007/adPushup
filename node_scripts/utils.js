const fs = require('fs');
const semver = require('semver');

const getNextVersion = ({ currentVersion, releaseType }) => {
  switch (releaseType) {
    case 'release':
      return semver.inc(currentVersion, 'minor');
    case 'hotfix':
      return semver.inc(currentVersion, 'patch');
    case 'staging':
      return `${currentVersion}+${new Date().getTime().toString()}`;
  }
};

const getFilesToUpdate = () => [
  { filePath: 'index.html', replace: ['v=VERSION', 'version = \'VERSION\''] },
  { filePath: 'version.json', replace: ['"VERSION"'] },
  { filePath: 'package.json', replace: ['"version": "VERSION"'] },
  { filePath: 'package-lock.json', replace: ['"version": "VERSION"'] },
  { filePath: 'fonts/icomoontemplate.less', replace: ['?VERSION', '?#iefixVERSION'] },
  { filePath: 'css/less/icomoon.less', replace: ['?VERSION', '?#iefixVERSION'] },
  { filePath: 'account.html', replace: ['v=VERSION', 'version = \'VERSION\''] },
];

const updateVersion = (oldVersion, newVersion) => {
  for (const file of getFilesToUpdate()) {
    const fileContent = fs.readFileSync(file.filePath, { encoding: 'utf8' });

    const fileContentWithUpdatedVersion = file.replace.reduce((acc, versionTemplate) => {
      const regex = new RegExp(versionTemplate.replace(/VERSION/, oldVersion).replace(/([?.])/g, '\\$1'), 'g');
      return acc.replace(regex, versionTemplate.replace(/VERSION/, newVersion));
    }, fileContent);

    fs.writeFileSync(file.filePath, fileContentWithUpdatedVersion, { encoding: 'utf8'});
  }
};

module.exports = {
  getNextVersion,
  updateVersion,
};