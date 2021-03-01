#!/usr/bin/env node

import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import * as readline from 'readline';
import https from 'https';

const credentialsPath = path.join(os.homedir(), '.github-mirror');

const description = `Usage:
${path.basename(process.argv[1])} destinationFolder

Credentials must be specified:
${credentialsPath}
USERNAME=<github-username>
TOKEN=<personal-access-token>`

declare global {
  interface String {
    hashCode: () => number;
  }
}
String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

const destinationFolder = process.argv[2];
if (!destinationFolder){
    console.error(description);
    console.error(`Destination folder not specified`);
    process.exit(1);
}
if (!fs.existsSync(credentialsPath)){
    console.error(description);
    console.error(`Credentials file not present: ${credentialsPath}`);
    process.exit(2);
}
const newline = /(\r\n|[\n\v\f\r\x85\u2028\u2029])/
let username = '';
let token = '';
for (let line of fs.readFileSync(credentialsPath, 'utf8').split(newline)){
    const match = line.match(/(\S+)\s*\=\s*(.*)/);
    if (match){
        const [key, value] = match.splice(1);
        switch (key.toLowerCase()){
            case 'username':
                username = value;
            case 'token':
                token = value;
        }
    }
}
if (!username){
    console.error(description);
    console.error(`Username not specified in ${credentialsPath}`);
    process.exit(3);
}
if (!token){
    console.error(description);
    console.error(`Token not specified in ${credentialsPath}`);
    process.exit(4);
}

function simpleFetch(url: string): Promise<string>{
    return new Promise((resolve, reject) => {
        https.get(url, {
            auth: `${username}:${token}`,
            headers: {
                'User-Agent': 'github-mirror / 1.0'
            },
        }, res => {
            res.setEncoding("utf8");
            let body = "";
            res.on("data", data => {
                body += data;
            });
            res.on("end", () => {
                resolve(body);
            });
        });
    });
}
function fetchReposPage(page: number): Promise<GitHubRepo[]>{
    const url = `https://api.github.com/users/${username}/repos?per_page=100&page=${page}`;
    console.log('Fetching '+url);
    return simpleFetch(url).then(body => JSON.parse(body));
}
async function main(){
    const repos = [];
    let page = 0;
    let pageEmpty = false;
    while (!pageEmpty){
        page += 1;
        let pageRepos = await fetchReposPage(page);
        console.log(`Got ${pageRepos.length} more repos`);
        if (!pageRepos.length){
            break;
        }
        repos.push(...pageRepos);
    }
    console.log(`User has ${repos.length} repositories`);
    for (let repo of repos){
        const repoFolder = path.join(destinationFolder, repo.name);
        const repoPath = path.join(repoFolder, `${repo.name}.git`);
        const wikiPath = path.join(repoFolder, `${repo.name}.wiki.git`);
        const issuesPath = path.join(repoFolder, `${repo.name}.issues.json`);
        let statusString = `${repo.name.padEnd(32)} `
        process.stdout.write(statusString+'Cloning repository ...');
        const repoProcess = child_process.spawnSync('git', ['clone', '--quiet', '--mirror', `https://${username}:${token}@github.com/${username}/${repo.name}.git`, repoPath]);
        if (repoProcess.status === 128){
            statusString += `Repository: OK`.padEnd(24)
        } else if (repoProcess.status){
            statusString += `Repository: FAILED (${repoProcess.status})`.padEnd(24)
        } else {
            statusString += 'Repository: UPDATED'.padEnd(24)
        }
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(statusString+'Fetching issues ...');
        let issuesFailed = false;
        let issues = '';
        try{
            issues = await simpleFetch(`https://api.github.com/repos/${username}/${repo.name}/issues`);
        } catch (error) {
            issuesFailed = true;
        }
        if (issuesFailed){
            statusString += 'Issues: FAILED'.padEnd(24)
        } else {
            let oldHash = 0;
            try{
                oldHash = fs.readFileSync(issuesPath, 'utf8').hashCode();
            } catch (error) {
                //
            }
            if (issues.hashCode() == oldHash){
                statusString += 'Issues: OK'.padEnd(24)
            } else {
                fs.writeFileSync(issuesPath, issues);
                statusString += 'Issues: UPDATED'.padEnd(24)
            }
        }
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(statusString+'Cloning wiki ...');
        const wikiProcess = child_process.spawnSync('git', ['clone', '--quiet', '--mirror', `https://${username}:${token}@github.com/${username}/${repo.name}.wiki.git`, wikiPath])
        if (wikiProcess.status === 128){
            // statusString += 'Wiki: NONE'.padEnd(24)
        } else if (wikiProcess.status){
            statusString += 'Wiki: FAILED'.padEnd(24)
        } else {
            statusString += 'Wiki: OK'.padEnd(24)
        }
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(statusString+'\n');
    }
    for (let entry of fs.readdirSync(destinationFolder, {withFileTypes: true})){
        if (entry.isDirectory() && !repos.find(repo => repo.name === entry.name)){
            let statusString = `${entry.name.padEnd(32)} No longer on GitHub. `
            process.stdout.write(statusString+'Removing ...');
            const repoProcess = child_process.spawnSync('rm', ['-rvf', path.join(destinationFolder, entry.name)]);
            if (repoProcess.status){
                statusString += 'REMOVAL FAILED'
            } else {
                statusString += 'REMOVED'
            }
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(statusString);
            process.stdout.write(statusString+'\n');
        }
    }
}
main();
