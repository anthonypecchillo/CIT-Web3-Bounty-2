const { expect } = require("chai");
const { ethers } = require("hardhat");

// Units are "seconds"
const TEN_DAYS = 60 * 60 * 24 * 10;
const ONE_TOKEN = ethers.utils.parseEther("1");
const TEN_TOKENS = ethers.utils.parseEther("10");
const ELEVEN_TOKENS = ethers.utils.parseEther("11");
const TWENTY_TOKENS = ethers.utils.parseEther("20");
const NINETY_TOKENS = ethers.utils.parseEther("90");
const ONE_HUNDRED_TOKENS = ethers.utils.parseEther("100");
const ONE_HUNDRED_AND_TEN_TOKENS = ethers.utils.parseEther("110");

// -----------------------------------------------
// Hard-Coded for Henkaku CIT Intro to Web3 Course
// -----------------------------------------------
// Units are "seconds" not "milliseconds"
// (Thu May 07 2022 01:00:00) <=> 1651971600 (sec)
// (Thu Jun 08 2023 01:00:00) <=> 1686186000 (sec)
// const PAST_EVENT_START_TIME_UTC = 1651971600;
const FUTURE_EVENT_START_TIME_UTC = 1686186000;
// -----------------------------------------------

// ----------------------------------------------------------
// Replace Hard-Coded Version Above with this for General Use
// ----------------------------------------------------------
// // Units are "seconds" not "milliseconds"
const PAST_EVENT_START_TIME_UTC = Math.floor(new Date().getTime() / 1000) - TEN_DAYS;
// const FUTURE_EVENT_START_TIME_UTC = Math.floor(new Date().getTime() / 1000) = TEN_DAYS;
// ----------------------------------------------------------

const setupFixtures = async (name, symbol, startTime) => {
  // TODO: Remove erwin and better organize test users throughout suite
  let owner, alice, bob, carol, dave, erwin;
  let Registry, registry, CJPY, cJPY, TicketNFT, ticketNFT, POAP, poap;
  // Get signers (test user accounts)
  [owner, alice, bob, carol, dave, erwin] = await ethers.getSigners();
  // Deploy Registry contract
  Registry = await ethers.getContractFactory("Registry");
  registry = await Registry.deploy();
  await registry.deployed();
  // Deploy cJPY contract
  CJPY = await ethers.getContractFactory("CJPY");
  cJPY = await CJPY.deploy(registry.address);
  await cJPY.deployed();

  // Deploy TicketNFT contract
  TicketNFT = await ethers.getContractFactory("TicketNFT");
  ticketNFT = await TicketNFT.deploy(
    `${name} Tickets`,
    `${symbol}T`,
    cJPY.address,
    TEN_TOKENS,
    startTime,
  );
  await ticketNFT.deployed();

  // Deploy POAP contract
  POAP = await ethers.getContractFactory("POAP");
  poap = await POAP.deploy(
    ticketNFT.address,
    `${name} POAP`,
    `${symbol}P`,
    );
  await poap.deployed();

  // TODO: Remove erwin and better organize test users throughout suite
  await registry.connect(owner).bulkAddToWhitelist([
    ethers.constants.AddressZero,
    owner.address,
    alice.address,
    bob.address,
    carol.address,
    erwin.address,
    ticketNFT.address,
  ]);

  // Mint cJPY tokens to test users
  await cJPY.connect(owner).mint(owner.address, ONE_HUNDRED_TOKENS);
  await cJPY.connect(owner).mint(alice.address, ONE_HUNDRED_TOKENS);
  await cJPY.connect(owner).mint(bob.address, ONE_HUNDRED_TOKENS);
  await cJPY.connect(owner).mint(carol.address, ONE_HUNDRED_TOKENS);
  // TODO: Remove erwin and better organize test users throughout suite
  await cJPY.connect(owner).mint(erwin.address, ONE_HUNDRED_TOKENS);

  // Approve the TicketNFT contract to spend cJPY tokens on behalf of test users
  await cJPY.connect(owner).approve(ticketNFT.address, ONE_HUNDRED_TOKENS);
  await cJPY.connect(alice).approve(ticketNFT.address, ONE_HUNDRED_TOKENS);
  await cJPY.connect(bob).approve(ticketNFT.address, ONE_HUNDRED_TOKENS);
  await cJPY.connect(carol).approve(ticketNFT.address, ONE_HUNDRED_TOKENS);

  // TODO: Remove erwin and better organize test users throughout suite
  return { owner, alice, bob, carol, dave, erwin, registry, cJPY, ticketNFT, poap };
};

describe("TicketNFT", function () {

  describe("Initializing Our Contracts", function () {

    let fixtures;
    beforeEach(async function () {
      fixtures = await setupFixtures("Chiba Hill", "CH", FUTURE_EVENT_START_TIME_UTC);
    });

    it("Should correctly initialize the TicketNFT contract", async function () {
      const { owner, cJPY, ticketNFT } = fixtures;
      expect(await ticketNFT.name()).to.equal("Chiba Hill Tickets");
      expect(await ticketNFT.symbol()).to.equal("CHT");
      expect(await ticketNFT.cJPYToken()).to.equal(cJPY.address);
      expect(await ticketNFT.owner()).to.equal(owner.address);
      expect(await ticketNFT.startTime()).to.equal(FUTURE_EVENT_START_TIME_UTC);
      expect(await ticketNFT.ticketPrice()).to.equal(TEN_TOKENS);
      expect(await ticketNFT.ticketCounter()).to.equal(0);
    });

    it("Should correctly initialize the POAP contract", async function () {
      const { ticketNFT, poap } = fixtures;
      expect(await poap.name()).to.equal("Chiba Hill POAP");
      expect(await poap.symbol()).to.equal("CHP");
      expect(await poap.ticketNFT()).to.equal(ticketNFT.address);
      expect(await poap.poapCounter()).to.equal(0);
    });
   });

  describe("Before the Event Starts", function () {

    let fixtures;
    beforeEach(async function () {
      fixtures = await setupFixtures("Future Event", "FE", FUTURE_EVENT_START_TIME_UTC);
    });

    it("Should allow ticket minting by whitelist members", async function () {
      const { alice, cJPY, ticketNFT } = fixtures;
      expect(await cJPY.balanceOf(ticketNFT.address)).to.equal(0);
      await ticketNFT.connect(alice).mint(alice.address);
      expect(await ticketNFT.ownerOf(1)).to.equal(alice.address);
      expect(await cJPY.balanceOf(ticketNFT.address)).to.equal(TEN_TOKENS);
    });

    it("Should allow ticket minting by whitelist members on behalf of others", async function () {
      const { alice, bob, cJPY, ticketNFT } = fixtures;
      expect(await cJPY.balanceOf(ticketNFT.address)).to.equal(0);
      await ticketNFT.connect(alice).mint(bob.address);
      expect(await ticketNFT.ownerOf(1)).to.equal(bob.address);
      expect(await cJPY.balanceOf(ticketNFT.address)).to.equal(TEN_TOKENS);
      expect(await cJPY.balanceOf(alice.address)).to.equal(NINETY_TOKENS);
      expect(await cJPY.balanceOf(bob.address)).to.equal(ONE_HUNDRED_TOKENS);
    });

    it("Should correctly increment ticket ids when multiple tickets are minted", async function () {
      const { alice, bob, carol, ticketNFT } = fixtures;
      await ticketNFT.connect(alice).mint(alice.address);
      await ticketNFT.connect(bob).mint(bob.address);
      await ticketNFT.connect(carol).mint(carol.address);
      expect(await ticketNFT.ownerOf(1)).to.equal(alice.address);
      expect(await ticketNFT.ownerOf(2)).to.equal(bob.address);
      expect(await ticketNFT.ownerOf(3)).to.equal(carol.address);
    });

    it("Should correctly update ticket ownership when a ticket is transferred", async function () {
      const { alice, bob, ticketNFT } = fixtures;
      await ticketNFT.connect(alice).mint(alice.address);
      await ticketNFT.connect(alice).transferFrom(alice.address, bob.address, 1);
      expect(await ticketNFT.ownerOf(1)).to.equal(bob.address);
    });

    it("Should prevent ticket minting by non-whitelist members", async function () {
      const { dave, ticketNFT } = fixtures;
      await expect(ticketNFT.connect(dave).mint(dave.address)).to.be.revertedWith("Insufficient cJPY balance.");
    });

    it("Should prevent ticket minting if the customer has an insufficient cJPY balance", async function () {
      const { alice, carol, cJPY, ticketNFT } = fixtures;
      await cJPY.connect(alice).transfer(carol.address, ONE_HUNDRED_TOKENS);
      await expect(ticketNFT.connect(alice).mint(alice.address)).to.be.revertedWith("Insufficient cJPY balance.");
    });

    it("Should prevent ticket minting if sender hasn't approved the contract first", async function () {
      // TODO: Remove erwin and better organize test users throughout suite
      const { cJPY, owner, erwin, ticketNFT } = fixtures;

      await expect(ticketNFT.connect(erwin).mint(erwin.address)).to.be.revertedWith("ERC20: insufficient allowance");

      await cJPY.connect(erwin).approve(ticketNFT.address, ONE_HUNDRED_TOKENS);
      await ticketNFT.connect(erwin).mint(erwin.address);
      expect(await ticketNFT.ownerOf(1)).to.equal(erwin.address);
    });

    it("Should allow the owner to update the ticket price", async function () {
      const { owner, ticketNFT } = fixtures;
      await ticketNFT.connect(owner).updateTicketPrice(TWENTY_TOKENS);
      expect(await ticketNFT.ticketPrice()).to.equal(TWENTY_TOKENS);
    });

    it("Should prevent non-owners from updating the ticket price", async function () {
      const { alice, ticketNFT } = fixtures;
      await expect(ticketNFT.connect(alice).updateTicketPrice(TWENTY_TOKENS)).to.be.revertedWith("Caller is not the owner.");
    });

    it("Should allow the owner to withdraw cJPY tokens when there is a positive balance", async function () {
      const { owner, alice, cJPY, ticketNFT } = fixtures;
      expect(await cJPY.balanceOf(owner.address)).to.equal(ONE_HUNDRED_TOKENS);
      await ticketNFT.connect(alice).mint(alice.address);
      await ticketNFT.connect(owner).withdraw(TEN_TOKENS);
      expect(await cJPY.balanceOf(owner.address)).to.equal(ONE_HUNDRED_AND_TEN_TOKENS);
    });

    it("Should prevent the owner from withdrawing more cJPY tokens than are in the contract", async function () {
      const { owner, alice, cJPY, ticketNFT } = fixtures;
      expect(await cJPY.balanceOf(owner.address)).to.equal(ONE_HUNDRED_TOKENS);
      await ticketNFT.connect(alice).mint(alice.address);
      await expect(ticketNFT.connect(owner).withdraw(ELEVEN_TOKENS)).to.be.revertedWith("Insufficient contract balance.");
      // expect(await cJPY.balanceOf(owner.address)).to.equal(TEN_TOKENS);
    });

    it("Should prevent non-owner from withdrawing cJPY tokens", async function () {
      const { alice, ticketNFT } = fixtures;
      await expect(ticketNFT.connect(alice).withdraw(TEN_TOKENS)).to.be.revertedWith("Caller is not the owner.");
    });

    it("Should prevent minting of POAP tokens before the event", async function () {
      // Alice tries to redeem a POAP token with her ticket
      const { alice, ticketNFT, poap } = fixtures;
      await ticketNFT.connect(alice).mint(alice.address);
      await expect(poap.connect(alice).mint(1, alice.address)).to.be.revertedWith("Event hasn't started yet.");
    });
  });

  describe("After the Event Starts", function () {

    let fixtures;
    beforeEach(async function () {
      fixtures = await setupFixtures("Past Event", "PE", PAST_EVENT_START_TIME_UTC);
      await fixtures.ticketNFT.connect(fixtures.owner).mint(fixtures.alice.address);
    });

    it("Should allow ticket minting by the owner on behalf of whitelist members after the event has started", async function () {
      const { owner, alice, ticketNFT } = fixtures;
      ticketNFT.connect(owner).mint(alice.address);
      expect(await ticketNFT.ownerOf(1)).to.equal(alice.address);
    });

    it("Should prevent ticket minting by anyone else after the event has started", async function () {
      const { alice, ticketNFT } = fixtures;
      await expect(ticketNFT.connect(alice).mint(alice.address)).to.be.revertedWith("Event already started. Ticket sales are finished!");
    });

    it("Should allow minting of POAP tokens after the event", async function () {
      const { alice, poap } = fixtures;
      // Alice redeems a POAP token with her ticket
      await poap.connect(alice).mint(1, alice.address);
      expect(await poap.ownerOf(1)).to.equal(alice.address);
    });

    it("Should burn the ticket after redeeming a POAP token", async function () {
      const { alice, ticketNFT, poap } = fixtures;
      // Alice redeems a POAP token with her ticket
      await poap.connect(alice).mint(1, alice.address);
      // Her ticket should be burned now
      await expect(ticketNFT.ownerOf(1)).to.be.revertedWith("ERC721: invalid token ID");
    });

    it("Should prevent redeeming a POAP token with an invalid ticket", async function () {
      const { bob, poap } = fixtures;
      // Bob tries to redeem a POAP token with a non-existent ticket
      await expect(poap.connect(bob).mint(2, bob.address)).to.be.revertedWith("ERC721: invalid token ID");
    });

    it("Should prevent redeeming a POAP token twice with the same ticket", async function () {
      const { alice, poap } = fixtures;
      // Alice redeems a POAP token with her ticket
      await poap.connect(alice).mint(1, alice.address);
      // Alice tries to redeem another POAP token with the same ticket
      await expect(poap.connect(alice).mint(1, alice.address)).to.be.revertedWith("ERC721: invalid token ID");
    });

  });
});