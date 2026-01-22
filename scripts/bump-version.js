#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 버전을 올리는 함수 (patch 버전)
function bumpVersion(version) {
  const parts = version.split('.');
  parts[2] = String(parseInt(parts[2], 10) + 1);
  return parts.join('.');
}

// package.json 파일 업데이트
function updatePackageVersion(packagePath, newVersion) {
  const packageJsonPath = path.join(packagePath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const oldVersion = packageJson.version;
  packageJson.version = newVersion;
  
  // react/vue는 core 의존성을 변경하지 않고 유지
  // (^1.0.1 같은 범위는 1.0.x 버전 모두를 포함하므로 새 버전도 자동으로 포함됨)
  // lockfile 업데이트 시 npm에 아직 발행되지 않은 버전을 참조하는 것을 방지
  
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

console.log(`Bumping version from ${currentVersion} to ${newVersion}`);

// 모든 패키지 버전 업데이트
// react/vue는 core 의존성을 변경하지 않고 유지 (^ 범위로 새 버전도 포함됨)
packages.forEach((pkg) => {
  const packagePath = path.join(packagesDir, pkg);
  const oldVersion = updatePackageVersion(packagePath, newVersion);
  console.log(`Updated ${pkg}: ${oldVersion} -> ${newVersion}`);
});

console.log(`\nAll packages updated to version ${newVersion}`);
