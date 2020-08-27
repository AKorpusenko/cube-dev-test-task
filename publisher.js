const fs = require("fs");
const path = require("path");
const csv = require("@fast-csv/parse");
const { countSecondsDiff } = require("./utils");

const DONORS_PATH = path.join(__dirname, "./db/Donors.csv");
const BUFFER_SIZE_LIMIT = 1e6;

const NATS = require("nats");
const nc = NATS.connect();

const startTime = new Date();
let buffer = [];
const statesStats = {};

const solve = async () => {
  return await new Promise((resolve, reject) => {
    let tasksTotal = 0;
    let tasksCompleted = 0;

    fs.createReadStream(DONORS_PATH)
      .pipe(csv.parse())
      .on("error", (error) => {
        console.error(error);
        reject(error);
      })
      .on("data", (row) => {
        if (buffer.length < BUFFER_SIZE_LIMIT) {
          // Getting only donorId and stateName
          const neededRowData = [row[0], row[2]];
          buffer.push(neededRowData);
        } else {
          tasksTotal++;
          const requestData = JSON.stringify(buffer);
          buffer = [];
          const t1 = new Date();

          nc.request(
            "subtask",
            requestData,
            { max: 1, timeout: 10000000 },
            (msg) => {
              if (
                msg instanceof NATS.NatsError &&
                msg.code === NATS.REQ_TIMEOUT
              ) {
                console.log("request timed out");
              } else {
                console.log("Got a response for a subtask");

                const subStatistics = JSON.parse(msg);
                const states = Object.keys(subStatistics);

                states.forEach((s) => {
                  statesStats[s] += subStatistics[s];
                });

                console.log(`Completed in ${countSecondsDiff(t1)} seconds`);

                if (tasksCompleted === tasksTotal) {
                  console.log(
                    `SQL request completed in ${countSecondsDiff(
                      startTime
                    )} seconds`
                  );

                  resolve(statesStats);
                }
              }
            }
          );
        }
      })
      .on("end", (rowCount) => {
        console.log(
          `Donors.csv. Parsed ${rowCount} rows in ${countSecondsDiff(
            startTime
          )}`
        );
      });
  });
};

module.exports = { solve };