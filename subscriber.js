const fs = require("fs");
const path = require("path");
const csv = require("@fast-csv/parse");
const NATS = require("nats");

const nc = NATS.connect();
const DONATIONS_PATH = path.join(__dirname, "./db/Donations.csv");

const solveTask = async (donors) => {
  const donorsState = {};
  const stateDonations = {};

  donors.forEach((d) => (donorsState[d[0]] = d[1]));

  return new Promise((resolve, reject) => {
    fs.createReadStream(DONATIONS_PATH)
      .pipe(csv.parse())
      .on("error", (error) => {
        console.log(error);
        reject(error);
      })
      .on("data", (row) => {
        const donorId = row[2];
        const donationAmount = row[4];
        const state = donorsState[donorId];

        // Count result if donor is present in current subtask
        if (state) {
          if (!stateDonations[state]) {
            stateDonations[state] = 0;
          }
          stateDonations[state] += parseInt(donationAmount);
        }
      })
      .on("end", () => {
        console.log("Subtask completed: ", donorsState);
        resolve(stateDonations);
      });
  });
};

nc.subscribe("subtask", async (request, replyTo) => {
  const donors = JSON.parse(request);
  console.log({ donors });
  const result = await solveTask(donors);

  nc.publish(replyTo, JSON.stringify(result));
});
