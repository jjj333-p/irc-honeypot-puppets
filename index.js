import fs from "node:fs";
import YAML from "yaml";
import NodeIRC from "irc";

const cfgTXT = fs.readFileSync("config.yaml", "utf-8");
const config = YAML.parse(cfgTXT);

const namesTXT = fs.readFileSync("first-names.txt", "utf-8");
const namesList = namesTXT.split("\r\n");

// Shuffle the array (Fisher-Yates algorithm)
for (let i = namesList.length - 1; i > 0; i--) {
	const j = Math.floor(Math.random() * (i + 1));
	[namesList[i], namesList[j]] = [namesList[j], namesList[i]];
}

for (const server of config.servers) {
	//limited number of names
	if (server.puppetCount > namesList.length) {
		console.warn(
			`Exceeding max puppet count for ${server.domain}, using ${namesList.length} instead.`,
		);
		server.puppetCount = namesList.length;
	}

	//randomly select subset of randomly organized names
	const offset = Math.floor(
		Math.random() * (namesList.length - server.puppetCount),
	);

	let first = true;

	for (let i = offset; i < server.puppetCount + offset; i++) {
		const client = new NodeIRC.Client(server.domain, namesList[i], {
			channels: server.channels,
			port: server.port,
			autoConnect: true,
			secure: server.tls,
		});

		//only log from one of the accounts
		if (first) {
			client.addListener("message", (from, to, message) => {
				console.log(`${from} => ${to}: ${message}`);

				if (message.includes(namesList[i]) && to.startsWith("#")) {
					client.say(to, `${from}: ??`);
				}
			});
			first = false;
		} else {
			client.addListener("message", (from, to, message) => {
				if (message.includes(namesList[i]) && to.startsWith("#")) {
					client.say(to, `${from}: ??`);
				}
			});
		}

		// Event: When the bot is connected
		client.addListener("registered", () => {
			console.log(`${namesList[i]} connected to the server!`);

			if (!server.dmWhenOnline) return;

			if (server.dmWhenOnline.startsWith("#")) {
				console.warn(
					`Cannot send to channel such as ${server.dmWhenOnline} on startup. Must be a user or empty.`,
				);
				return;
			}

			client.say(server.dmWhenOnline, "Connected Successfully"); // Send a message to a user
		});
	}
}
