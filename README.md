# Interview task solution for Cube.dev team

### Task Description

Given two `.csv` files name `Donors.csv` and `Donations.csv` which represent a SQL DB tables.
Number of rows for: - Donors ~ `1e9` - Donations ~ `1e10`

So the data inside looks like:
_Donors_

```js
const donors = [
  // 1e9
  { id: "a", state: "California" },
  { id: "b", state: "New York" },
  { id: "c", state: "California" },
  { id: "d", state: "Florida" },
];
```

_Donations_

```js
const donations = [
  // 1e10
  { donor_id: "a", amount: "100" },
  { donor_id: "a", amount: "400" },
  { donor_id: "b", amount: "200" },
  { donor_id: "c", amount: "300" },
  { donor_id: "d", amount: "500" },
];
```

_There are about 1024 servers in the cluster_

The task is to emulate following sql request and recive the answer:

```sql
select state, sum(amount) from donors, donations where donations.donor_id = donors.id group by state`
```

### Solution Descripton

First of all lets understand how answer should look like?
You are totaly right this gonna be map of state names as the keys and the total amount of donations as values

So we defentily should use it.

As the tables are too big to be in-memory at the same time the obvious descision is split the file.
A part shouldn't be too large to fit in memory.
So lets use NodeJs Streams for this purpose. We can read about 1e6 (1M) rows from donors table, create a subtask
and push it to some job queue.
I dicided to use Nats as it got simple auto balancer.

So what is the task?
Lets count statistics `[state] = amout` for subset of donors.
Lets memorize for `donorId` the state where Donor is from using hash_map where `get` and `put` operation are working for `O(1)` time. `[donorId] = state`.
Iterating throught the whole `1e10` donations is expencive, but acceptable time spending. Complexity of loop is `O(N)`.
So for every donation we check either there is a state for such `donorId` or not.
If there is, then we sum the donation for this state.

If we split 1e6 for every subscruber server, then each of them will work few minutes.
For sure there can be added some optimiztions, because we iterate through many and many time each element.

Never the less this solution works.

#### How to run it

- Place `Donors.csv` and `Donations.csv` from kagle into `/db` directory 
- Using `docker-compose` set up the nats.
- Run 1024 `subscriber.js` instances
- Run `index.js` which will execute `publisher.js` code
