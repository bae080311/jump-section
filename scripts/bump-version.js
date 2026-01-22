#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 버전을 올리는 함수 (patch 버전)
function bumpVersion(version) {
  const parts = version.split('.');
  parts[2] = String(parseInt(parts[2], 10) + 1);
  return parts.join('.');
}

// 버전을 내리는 함수 (patch 버전 - 1)
function previousVersion(version) {
  const parts = version.split('.');
  parts[2] = String(Math.max(0, parseInt(parts[2], 10) - 1));
  return parts.join('.');
}

// package.json 파일 업데이트
function updatePackageVersion(packagePath, newVersion, previousCoreVersion) {
  const packageJsonPath = path.join(packagePath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const oldVersion = packageJson.version;
  packageJson.version = newVersion;
  
  // react/vue는 core 의존성을 이전 버전으로 유지
  // (core를 먼저 발행한 후 react/vue를 발행하므로, ^ 범위로 인해 새 버전도 포함됨)
  if (packageJson.dependencies && packageJson.dependencies['@jump-section/core']) {
    packageJson.dependencies['@jump-section/core'] = `^${previousCoreVersion}`;
  }
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  return oldVersion;
}

// 패키지 디렉토리들
const packages = ['core', 'react', 'vue'];
const packagesDir = path.join(__dirname, '..', 'packages');

// core 패키지의 현재 버전 확인
const corePackagePath = path.join(packagesDir, 'core', 'package.json');
const corePackageJson = JSON.parse(fs.readFileSync(corePackagePath, 'utf8'));
const currentVersion = corePackageJson.version;
const newVersion = bumpVersion(currentVersion);
const previousCoreVersion = previousVersion(currentVersion); // react/vue는 이전 버전을 의존성으로 사용

console.log(`Bumping version from ${currentVersion} to ${newVersion}`);

// 모든 패키지 버전 업데이트
// react/vue는 core 의존성을 이전 버전(현재 버전)으로 유지
packages.forEach((pkg) => {
  const packagePath = path.join(packagesDir, pkg);
  const oldVersion = updatePackageVersion(packagePath, newVersion, previousCoreVersion);
  console.log(`Updated ${pkg}: ${oldVersion} -> ${newVersion}`);
});

console.log(`\nAll packages updated to version ${newVersion}`);
