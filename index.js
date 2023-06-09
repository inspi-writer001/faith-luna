const Moralis = require("moralis").default;
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { EvmChain } = require("@moralisweb3/common-evm-utils");

// to use our .env variables
dotenv.config();

const app = express();
const port = process.env.PORT || 4002;

app.use(express.json());
app.use(cookieParser());
// origin: "http://localhost:3000",
// allow access to React app domain..
// app.use(
//   cors({
//     origin: "https://faithluna-nft.web.app",
//     credentials: true
//   })
// );

app.use(
  cors({
    origin: "*"
  })
);

const config = {
  domain: process.env.APP_DOMAIN,
  statement: "Please sign this message to confirm your identity.",
  uri: process.env.REACT_URL,
  timeout: 60
};

// request message to be signed by client
app.post("/request-message", async (req, res) => {
  const { address, chain, network } = req.body;
  //   console.log(address + chain + network);
  console.log(chain);
  try {
    const message = await Moralis.Auth.requestMessage({
      address: address,
      chain: chain,

      domain: process.env.APP_DOMAIN,
      statement: "Please sign this message to confirm your identity.",
      uri: process.env.REACT_URL,
      timeout: 60
    });

    res.status(200).json(message);
    console.log(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
    console.error(error);
  }
});

app.post("/verify", async (req, res) => {
  try {
    const { message, signature } = req.body;

    const { address, profileId } = (
      await Moralis.Auth.verify({
        message,
        signature,
        networkType: "evm"
      })
    ).raw;

    const user = { address, profileId, signature };

    // create JWT token
    const token = jwt.sign(user, process.env.AUTH_SECRET);

    // set JWT cookie
    res.cookie("jwt", token, {
      httpOnly: true
    });

    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
    console.error(error);
  }
});

app.get("/authenticate", async (req, res) => {
  const token = req.cookies.jwt;
  if (!token) return res.sendStatus(403); // if the user did not send a jwt token, they are unauthorized

  try {
    const data = jwt.verify(token, process.env.AUTH_SECRET);
    res.json(data);
  } catch (error) {
    console.log("error occured" + error);
    return res.sendStatus(403);
  }
});

app.post("/get-nft/:address", async (req, res) => {
  const address = req.params.address;
  const chain = EvmChain.MUMBAI;
  try {
    const response = await Moralis.EvmApi.nft.getWalletNFTs({
      address,
      chain
    });
    res.status(200).json({ message: response });
  } catch (error) {
    console.log(error);
    res.status(409).json({ message: "error occured" + error });
  }
});

app.get("/logout", async (req, res) => {
  try {
    res.clearCookie("jwt");
    return res.sendStatus(200);
  } catch (error) {
    console.log("error occured" + error);
    return res.sendStatus(403);
  }
});

app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello, you're hitting faithluna" });
});

const startServer = async () => {
  await Moralis.start({
    apiKey: process.env.MORALIS_API_KEY
  });

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
};

startServer();
