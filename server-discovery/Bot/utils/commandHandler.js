const fs = require('fs');
const path = require('path');

const commands = {};
const commandsPath = path.join(__dirname, '../commands');

fs.readdirSync(commandsPath).forEach(category => {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.lstatSync(categoryPath).isDirectory()) return;

    fs.readdirSync(categoryPath).filter(f => f.endsWith('.js')).forEach(file => {
        const cmd = require(path.join(categoryPath, file));
        const name = file.split('.')[0];
        
        commands[name] = cmd.execute || cmd[`handle${name.charAt(0).toUpperCase() + name.slice(1)}`];
    });
});

function handleCommand(message, prefix) {
    if (!message.content.startsWith(prefix)) return false;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const name = args.shift().toLowerCase();
    const run = commands[name];

    if (!run) return false;

    run(message, prefix, ...args);

    return true;
}

module.exports = { handleCommand, commands };