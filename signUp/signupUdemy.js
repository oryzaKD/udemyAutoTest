// signupUdemy.js
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { environment } from '../URL_Website.js';
dotenv.config();
import { writeLastValue, readLastValue } from '../fileUtils.js';

// Temp Email configuration
const emailPrefix = `testuser${Math.floor(Math.random() * 10000)}`;
const tempEmail = `${emailPrefix}@1secmail.com`;

async function fetchVerificationCode() {
  const maxAttempts = 12; // 12 attempts * 5 seconds = 1 minute max wait
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    try {
      const url = `https://www.1secmail.com/api/v1/?action=getMessages&login=${emailPrefix}&domain=1secmail.com`;
      const response = await fetch(url);
      const messages = await response.json();
      
      if (messages.length > 0) {
        const msgId = messages[0].id;
        const msgUrl = `https://www.1secmail.com/api/v1/?action=readMessage&login=${emailPrefix}&domain=1secmail.com&id=${msgId}`;
        const msgResponse = await fetch(msgUrl);
        const msgData = await msgResponse.json();

        const codeMatch = msgData.body.match(/\b\d{6}\b/);
        if (codeMatch) {
          console.log(`Verification code found: ${codeMatch[0]}`);
          return codeMatch[0];
        }
      }
      
      console.log(`Waiting for verification email (attempt ${attempts})`);
      await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds between checks
    } catch (error) {
      console.error('Error fetching email:', error);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  throw new Error('Verification code not received within time limit');
}

async function signupUdemy(identifier) {
  const options = new chrome.Options();
  options.addArguments(
    '--disable-blink-features=AutomationControlled',
    '--start-maximized'
  );

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    let lastValue = readLastValue(identifier);
    let newValue = lastValue + 1;
    
    // Navigate to Udemy signup page
    await driver.get(environment.URL + '/join/signup-popup/');

    // Fill the Full Name
    await driver.wait(until.elementLocated(By.id('form-group--1')), 10000);
    await driver.findElement(By.id('form-group--1')).sendKeys(`User${newValue}`);
    
    // Fill the Email
    await driver.findElement(By.id('form-group--3')).sendKeys(tempEmail);

    // Click Continue button
    await driver.findElement(By.xpath("//span[text()='Continue with email']")).click();
    console.log(`Sign-up initiated with email: ${tempEmail}`);

    // Wait for verification page and enter code
    await driver.wait(until.elementLocated(By.css('input[data-purpose="verification-code-input"]')), 30000);
    
    // Wait until function of VerificationCode running
    const code = await fetchVerificationCode();
    if (!code) {
      throw new Error('Failed to retrieve verification code');
    }

    // Enter each digit of the code
    const codeInputs = await driver.findElements(By.css('input[data-purpose="verification-code-input"]'));
    for (let i = 0; i < Math.min(code.length, codeInputs.length); i++) {
      await codeInputs[i].sendKeys(code[i]);
    }

    // Click Sign up button
    await driver.findElement(By.xpath("//span[text()='Sign up']")).click();
    
    // Verify successful signup
    console.log('Account created successfully!');
    
    writeLastValue(identifier, newValue);

  } catch (error) {
    console.error('Error during signup:', error);
  } finally {
    await driver.quit();
  }
}


signupUdemy('signUp').catch(console.error);