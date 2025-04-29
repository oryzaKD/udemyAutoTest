// signupUdemy.js

import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();
import environment from '../URL_Website';

// Email configuration
const emailConfig = {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    host: 'imap.gmail.com',
    port: 993,
    tls: true
};

async function getVerificationCode() {
    return new Promise((resolve, reject) => {
        const imapClient = new imap(emailConfig);

        imapClient.once('ready', () => {
            imapClient.openBox('INBOX', false, (err, box) => {
                if (err) return reject(err);

                // Search for Udemy verification email
                imapClient.search([
                    ['FROM', 'no-reply@e.udemymail.com'],
                    ['SUBJECT', "Udemy Login: Here's the 6-digit verification code you requested"],
                    ['UNSEEN']
                ], (err, results) => {
                    if (err) return reject(err);
                    if (!results || results.length === 0) {
                        return reject(new Error('No verification email found'));
                    }

                    const fetch = imapClient.fetch(results, { bodies: '' });
                    let codeFound = false;

                    fetch.on('message', (msg) => {
                        msg.on('body', async (stream) => {
                            try {
                                const parsed = await simpleParser(stream);
                                const codeMatch = parsed.text.match(/\b\d{6}\b/);
                                if (codeMatch && !codeFound) {
                                    codeFound = true;
                                    resolve(codeMatch[0]);
                                }
                            } catch (e) {
                                reject(e);
                            }
                        });
                    });

                    fetch.once('error', reject);
                    fetch.once('end', () => {
                        imapClient.end();
                        if (!codeFound) reject(new Error('Verification code not found'));
                    });
                });
            });
        });

        imapClient.once('error', reject);
        imapClient.connect();
    });
}

async function loginUdemy() {
    const options = new chrome.Options();
    options.addArguments('--disable-blink-features=AutomationControlled');
    options.addArguments('--start-maximized');

    const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

    try {
        // Navigate to Udemy login page
        await driver.get(environment.URL);

        // Click Log in button in top right corner
        await driver.sleep(1500);
        await driver.findElement(By.css('a[data-purpose="header-login"]')).click();
        await driver.sleep(2000);

        // Fill the Email
        await driver.sleep(1500);
        await driver.wait(until.elementLocated(By.id('form-group--1')));    //email field
        await driver.findElement(By.id('form-group--1')).sendKeys('odew.dewi12@gmail.com');

        // Click Continue Button
        await driver.findElement(By.xpath("//button[.//span[text()='Continue with email']]")).click();

        // Wait for verification page
        await driver.sleep(2000);
        await driver.wait(until.elementLocated(By.xpath("//input[@type='text' and @maxlength='6']")), 30000);   //verification code field

        // Get verification code from email
        await driver.sleep(2000);
        const verificationCode = await getVerificationCode();
        console.log(`Verification code: ${verificationCode}`);

        // Enter verification code
        const codeInputs = await driver.findElements(By.xpath("//input[@type='text' and @maxlength='6']"));

        for (let i = 0; i < Math.min(verificationCode.length, codeInputs.length); i++) {
            await codeInputs[i].sendKeys(verificationCode[i]);
        }

        // Click Log in button
        await driver.findElement(By.xpath("//button[.//span[text()='Log in']]")).click();

        console.log('Account created successfully!');

    } catch (error) {
        console.error('Error during signup:', error);
    } finally {
        await driver.quit();
    }
}

loginUdemy();
