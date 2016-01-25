# node-efdi
A test service for EFDI protobuf messages based on express

## Installation
Make sure you have installed [node.js](https://nodejs.org) on your system.

[Download](https://github.com/krone-landmaschinen/node-efdi/archive/master.zip) this repository to your local system or clone it
```
git clone https://github.com/krone-landmaschinen/node-efdi
```
Then install the modules. Go to your local directory of "node-efdi" and type
```
npm install
```


Currently the required proto files for FMISExchange and ISO_DIS_11783-10 need to be added manually into the "handlers" sub directory. This is due to licensing issues.

## Running the serive
Open a command line and change to the local repository directory. Then run the service by
```
node bin/www
```

Now you can access the service on your local system on port 3000
```
http://localhost:3000
```
