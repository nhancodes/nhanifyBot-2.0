import { getVideoById, parseURL, isValidURL } from "./dataAPI.js";
import auth from '../../auth.json' with {type: 'json' };


const invalidUrls: [string, boolean][] = [
    ["https://www.youtube.com/embed/QkGAoYtXA0", false],
    ["https://www.youtube.com/watch?v=", false],
    ["https://m.youtube.com/watch?list=PL12345", false],
    ["sfklsdjfl", false],
    ["www.youtube.com/watch?v=dQw4w9WgXcQ", false],
]
const validUrls: [string, boolean][] = [
    ["https://youtu.be/0yBnIUX0QAE", true],
    ["https://www.youtube.com/watch?v=2K-yXhZIZAM", true],
    ["https://www.youtube.com/watch?v=XShaIZs7J7M ; drop nhan", true],
    ["https://www.youtube.coM/watch?v=L3wKzyIN1yk", true],
    ["https://www.youtube.com/watch?v=TWQp1rLWN9A&list=RDGMEMWO-g6DgCWEqKlDtKbJA1Gw&index=30&ab_channel=FrancisMercier-Topic", true]
]

const urlIds: [string, string][] = [
    ["https://youtu.be/0yBnIUX0QAE", "0yBnIUX0QAE"],
    ["https://www.youtube.com/watch?v=2K-yXhZIZAM", "2K-yXhZIZAM"],
    ["https://www.youtube.com/watch?v=XShaIZs7J7M ; drop nhan", "XShaIZs7J7M ; drop nhan"],
    ["https://www.youtube.coM/watch?v=L3wKzyIN1yk", "L3wKzyIN1yk"],
    ["https://www.youtube.com/watch?v=TWQp1rLWN9A&list=RDGMEMWO-g6DgCWEqKlDtKbJA1Gw&index=30&ab_channel=FrancisMercier-Topic", "TWQp1rLWN9A"]
];

function assert(url: string, expected: string | boolean, cb: (arg: string) => boolean | string) {
    const actual = cb(url)
    const assert = actual === expected ? `✔PASSED: ${url}\n expected: ${expected} actual: ${actual}` : `✗FAILED: ${url}\n expected: ${expected} actual: ${actual}`
    console.log(assert);
}

console.log("\nInvalid urls");
invalidUrls.forEach(([url, expected]) => assert(url, expected, isValidURL));

console.log("\nValid urls");
validUrls.forEach(([url, expected]) => assert(url, expected, isValidURL));

console.log("\nParse video id from valid urls");
urlIds.forEach(([url, expected]) => assert(url, expected, parseURL));

const restrictedVideoIds: [string, { restriction?: string }][] = [
    ["FrULPuxyhWE", { restriction: "liveStream" }],
    ["IS4tFnFHD2E", { restriction: "notEmbeddable" }],
    ["9p9sGtV4UoU", { restriction: "duration" }],
    ["ICjyAe9S54c", { restriction: "region" }],
    ["j0lN0w5HVT8", { restriction: "age" }],
    ["2MStAY8YaJk", { restriction: "region" }],// This video is not available is in this cause is a region restriction
    ["N9hazmsUxrM", { restriction: "notEmbeddable" }],
    ["mg8_7SfwdfY", {}], // video has been removed same as video not existing
    ["2MStAY8YaJT", {}] // video do not exist 
];

console.log("\nRestricted videos");
restrictedVideoIds.forEach(async ([id, expected]) => {
    const actual = JSON.stringify(await getVideoById(id, auth.YT_API_KEY));
    const assert = actual === JSON.stringify(expected) ? `✔PASSED: ${id}\n expected: ${expected} actual: ${actual}` : `✗FAILED: ${id}\n expected: ${expected} actual: ${actual}`
    console.log(assert);
});