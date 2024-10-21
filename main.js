const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');
const fs = require('fs'); // Import the file system module

// Initialize the client with session persistence using LocalAuth
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true, // Set to true for headless mode
        args: ['--no-sandbox'],
    },
});

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    const qrcode = require('qrcode-terminal');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Client is ready!');

    try {
        // Access Puppeteer's browser instance
        const browser = client.pupBrowser;
        const page = (await browser.pages())[0];

        // Wait for the "Newsletter" icon to appear and click on it
        await page.waitForSelector(`span[data-icon="newsletter-outline"]`, { timeout: 30000 });
        await page.click(`span[data-icon="newsletter-outline"]`);

        // Wait for the "Channel list" to appear and click on the desired channel (e.g., Netflix)
        const title = "Netflix";
        await page.waitForSelector(`div[aria-label="Channel list"]`);
        await page.click(`span[title="${title}"]`);

        const messageLimit = 50;

        const messages = await page.evaluate(async (messageLimit) => {
            const scrollChatToTop = async () => {
                const chatContainer = document.querySelector('._ajyl'); // Replace with actual selector for chat container
                chatContainer.scrollTop = 0;
                return new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds to load messages
            };

            let previousHeight = document.querySelector('._ajyl').scrollHeight; // Get initial scroll height
            const messageTexts = [];

            while (messageTexts.length < messageLimit) {
                const messageElements = document.querySelectorAll('span.selectable-text');
                messageElements.forEach((message) => {
                    messageTexts.push(message.innerText);
                });

                if (messageTexts.length >= messageLimit) break;

                await scrollChatToTop();

                const newHeight = document.querySelector('._ajyl').scrollHeight;
                if (newHeight === previousHeight) {
                    break;
                }
                previousHeight = newHeight;
            }

            return messageTexts.slice(0, messageLimit);
        }, messageLimit);

        // Log the crawled messages
        console.log(`Crawled ${messages.length} messages:`, messages);

        // Save messages to a JSON file
        const filePath = './messages.json'; // Define the file path
        fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), 'utf-8'); // Write to file with pretty-print
        console.log(`Messages saved to ${filePath}`);
        
    } catch (error) {
        console.error('Error during crawling:', error);
    }
});

client.initialize();
