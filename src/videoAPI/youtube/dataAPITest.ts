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
]
console.log("Is an invalid url");
invalidUrls.forEach(([url, expected]) => console.log(`${url} ${isValidURL(url) === expected ? 'invalid PASSED' : 'valid FAILED'}`));

console.log("Is a valid url");
validUrls.forEach(([url, expected]) => console.log(`${url} ${isValidURL(url) === expected ? 'valid PASSED' : 'invalid FAILED'}`));

console.log("Parse url for video id");
urlIds.forEach(([url, expected]) => {
    const actual = parseURL(url)
    console.log(`${url} ${actual === expected ? 'valid PASSED' : 'invalid FAILED: got ' + actual}`)
});

const restrictedVideoIds: [string, { restriction?: string }][] = [
    ["FrULPuxyhWE", { restriction: "liveStream" }],
    ["IS4tFnFHD2E", { restriction: "notEmbeddable" }],
    ["9p9sGtV4UoU", { restriction: "duration" }],
    ["ICjyAe9S54c", { restriction: "region" }],
    ["j0lN0w5HVT8", { restriction: "age" }],
    ["2MStAY8YaJk", { restriction: "region" }],// This video is not available is in this cause is a region restriction
    ["N9hazmsUxrM", { restriction: "notEmbeddable" }],
    ["mg8_7SfwdfY", {}], // video has been removed 
    ["2MStAY8YaJT", {}] // video do not exist 
];

console.log("Restricted videos");
restrictedVideoIds.forEach(async ([id, restriction]) => console.log(`${id} ${JSON.stringify(await getVideoById(id, auth.YT_API_KEY)) === JSON.stringify(restriction)}`));