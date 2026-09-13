
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const crypto = require("crypto");
const PORT = 3000;

const publicFolder = path.join(__dirname, "public");
const dataFile = path.join(__dirname, "data.json");

const players = {};
const sessions={};
// ===============================
// SESSION FUNCTIONS
// ===============================

function createSession(userId) {

    const sessionId =
        crypto.randomBytes(24).toString("hex");

    sessions[sessionId] = userId;

    return sessionId;
}


// ===============================
// GET SESSION USER
// ===============================

function getSessionUser(req) {

    const cookieHeader =
        req.headers.cookie || "";

    const match =
        cookieHeader.match(
            /sessionId=([^;]+)/
        );

    if (!match) {
        return null;
    }

    const sessionId = match[1];

    const userId =
        sessions[sessionId];

    if (!userId) {
        return null;
    }

    const data = loadData();

    return (data.users || []).find(
        user =>
            String(user.id)
            ===
            String(userId)
    ) || null;
}


// ===============================
// DELETE SESSION
// ===============================

function deleteSession(req) {

    const cookieHeader =
        req.headers.cookie || "";

    const match =
        cookieHeader.match(
            /sessionId=([^;]+)/
        );

    if (!match) {
        return;
    }

    const sessionId = match[1];

    delete sessions[sessionId];
}
// ===============================
// REQUIRE LOGIN
// ===============================

function requireLogin(req, res) {

    const user =
        getSessionUser(req);

    if (!user) {

        res.writeHead(302, {
            "Location": "/login"
        });

        res.end();

        return null;
    }

    return user;
}
// ===============================
// REQUIRE ADMIN
// ===============================

function requireAdmin(req, res) {

    const user = getSessionUser(req);

    if (!user) {

        res.writeHead(302, {
            "Location": "/login"
        });

        res.end();

        return null;
    }

    if (user.role !== "admin") {

        sendResponse(
            res,
            403,
            `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Access Denied</title>

                <style>
                    body {
                        background: #0b0d17;
                        color: white;
                        font-family: Arial;
                        text-align: center;
                        padding: 100px 20px;
                    }

                    h1 {
                        color: #fb7185;
                    }

                    a {
                        display: inline-block;
                        margin-top: 20px;
                        padding: 14px 25px;
                        background: #8b5cf6;
                        color: white;
                        text-decoration: none;
                        border-radius: 9px;
                    }
                </style>
            </head>

            <body>

                <h1>🚫 Access Denied</h1>

                <p>
                    Only administrators can access this page.
                </p>

                <a href="/hunts">
                    ← Back to Hunts
                </a>

            </body>
            </html>
            `,
            "text/html"
        );

        return null;
    }

    return user;
}
// ===============================
// LOAD DATA
// ===============================

function loadData() {

    try {

        return JSON.parse(
            fs.readFileSync(dataFile, "utf8")
        );

    } catch (error) {

        console.log("Could not load data.json");

        return {
            users: [],
            hunts: [],
            progress: [],
            attempts: []
        };
    }
}
// ===============================
// SAVE DATA
// ===============================

function saveData(data) {
    try {
        fs.writeFileSync(
            dataFile,
            JSON.stringify(data, null, 2),
            "utf8"
        );

        return true;

    } catch (error) {
        console.log("Could not save data.json");
        return false;
    }
}

// ===============================
// SEND RESPONSE
// ===============================

function sendResponse(
    res,
    statusCode,
    content,
    contentType = "text/html"
) {

    res.writeHead(statusCode, {
        "Content-Type":
            `${contentType}; charset=utf-8`
    });

    res.end(content);
}
// ===============================
// READ REQUEST BODY
// ===============================

function readRequestBody(req, callback) {

    let body = "";

    req.on("data", chunk => {
        body += chunk.toString();
    });

    req.on("end", () => {
        callback(body);
    });

}

// ===============================
// READ HTML FILE
// ===============================

function readHTML(fileName) {

    try {

        return fs.readFileSync(
            path.join(publicFolder, fileName),
            "utf8"
        );

    } catch (error) {

        return null;
    }
}


// ===============================
// ESCAPE HTML
// ===============================

function escapeHTML(text) {

    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ===============================
// FIND HUNT
// ===============================

function findHunt(data, huntId) {

    return (data.hunts || []).find(
        hunt =>
            String(hunt.id) === String(huntId)
    );
}


// ===============================
// FIND CLUE
// ===============================

function findClue(hunt, level) {

    if (!hunt || !Array.isArray(hunt.clues)) {
        return null;
    }

    return hunt.clues.find(
        clue =>
            Number(clue.level) === Number(level)
    );
}


// ===============================
// 404 PAGE
// ===============================

function notFound(res) {

    sendResponse(
        res,
        404,
        `
        <!DOCTYPE html>

        <html>

        <head>

            <meta charset="UTF-8">

            <title>404</title>

            <style>

                body {
                    margin: 0;
                    background: #0b0d17;
                    color: white;
                    font-family: Arial;
                    text-align: center;
                    padding: 100px;
                }

                h1 {
                    color: #c084fc;
                    font-size: 60px;
                }

                a {
                    color: #c084fc;
                }

            </style>

        </head>

        <body>

            <h1>404</h1>

            <h2>Page Not Found</h2>

            <a href="/">
                ← Back to Home
            </a>

        </body>

        </html>
        `
    );
}


// ===============================
// HOME PAGE
// ===============================

function homePage(res) {

    const html = readHTML("index.html");

    if (!html) {

        sendResponse(
            res,
            404,
            "Could not load index.html",
            "text/plain"
        );

        return;
    }

    sendResponse(res, 200, html);
}

// ===============================
// HUNTS PAGE
// ===============================

function huntsPage(res) {

    const html = readHTML("hunts.html");

    if (!html) {

        sendResponse(
            res,
            404,
            "Could not load hunts.html",
            "text/plain"
        );

        return;
    }

    sendResponse(res, 200, html);
}





// ===============================
// LOGIN PAGE
// ===============================

function loginPage(res) {

    const html = readHTML("login.html");

    if (!html) {

        sendResponse(
            res,
            404,
            "Could not load login.html",
            "text/plain"
        );

        return;
    }

    sendResponse(res, 200, html);
}
// ===============================
// REGISTER PAGE
// ===============================

function registerPage(res) {

    const html = readHTML("register.html");

    if (!html) {

        sendResponse(
            res,
            404,
            "Could not load register.html",
            "text/plain"
        );

        return;
    }

    sendResponse(res, 200, html);
}


// ===============================
// REGISTER USER
// ===============================

function registerUser(
    res,
    name,
    username,
    password
) {

    const data = loadData();

    if (!data.users) {
        data.users = [];
    }


    // Check username

    const existingUser =
        data.users.find(
            user =>
                String(user.username)
                    .toLowerCase()
                ===
                String(username)
                    .trim()
                    .toLowerCase()
        );


    if (existingUser) {

        sendResponse(
            res,
            409,
            `
            <!DOCTYPE html>

            <html>

            <head>

                <meta charset="UTF-8">

                <title>
                    Registration Failed
                </title>

                <style>

                    body {
                        background: #0b0d17;
                        color: white;
                        font-family: Arial;
                        text-align: center;
                        padding: 100px;
                    }

                    h1 {
                        color: #fb7185;
                    }

                    a {
                        color: #c084fc;
                    }

                </style>

            </head>

            <body>

                <h1>
                    ❌ Username Already Exists
                </h1>

                <p>
                    Please choose another username.
                </p>

                <a href="/register">
                    ← Try Again
                </a>

            </body>

            </html>
            `
        );

        return;
    }


    // Create new ID

    let newId = 1;

    if (data.users.length > 0) {

        newId =
            Math.max(
                ...data.users.map(
                    user => Number(user.id) || 0
                )
            ) + 1;

    }


    // Create new user

    const newUser = {

        id: newId,

        name: String(name).trim(),

        username:
            String(username).trim(),

        password:
            String(password),

        role: "user"

    };


    data.users.push(newUser);


    // Save data.json

    try {

        fs.writeFileSync(
            dataFile,
            JSON.stringify(
                data,
                null,
                4
            )
        );

    } catch (error) {

        sendResponse(
            res,
            500,
            "Could not save user.",
            "text/plain"
        );

        return;
    }


    // Success

    sendResponse(
        res,
        201,
        `
        <!DOCTYPE html>

        <html>

        <head>

            <meta charset="UTF-8">

            <title>
                Registration Successful
            </title>

            <style>

                body {
                    background: #0b0d17;
                    color: white;
                    font-family: Arial;
                    text-align: center;
                    padding: 100px 20px;
                }

                .box {
                    max-width: 600px;
                    margin: auto;
                    background: #151927;
                    padding: 50px;
                    border-radius: 20px;
                    border: 1px solid #8b5cf6;
                }

                h1 {
                    color: #86efac;
                }

                a {
                    display: inline-block;
                    margin-top: 20px;
                    padding: 14px 25px;
                    background: #8b5cf6;
                    color: white;
                    text-decoration: none;
                    border-radius: 9px;
                    font-weight: bold;
                }

            </style>

        </head>

        <body>

            <div class="box">

                <div style="font-size:60px;">
                    🎉
                </div>

                <h1>
                    Registration Successful!
                </h1>

                <h2>
                    Welcome,
                    ${escapeHTML(newUser.name)}
                </h2>

                <p>
                    Your account has been created successfully.
                </p>

                <a href="/login">
                    🔓 LOGIN NOW
                </a>

            </div>

        </body>

        </html>
        `
    );
}

// ===============================
// LOGIN CHECK
// ===============================

function loginUser(
    res,
    username,
    password
) {

    const data = loadData();

    const user = (data.users || []).find(
        u =>
            String(u.username)
                .toLowerCase()
            ===
            String(username)
                .trim()
                .toLowerCase()
            &&
            String(u.password)
            ===
            String(password)
    );


    if (!user) {

        sendResponse(
            res,
            401,
            `
            <!DOCTYPE html>

            <html>

            <head>

                <meta charset="UTF-8">

                <title>Login Failed</title>

                <style>

                    body {
                        background: #0b0d17;
                        color: white;
                        font-family: Arial;
                        text-align: center;
                        padding: 100px;
                    }

                    h1 {
                        color: #fb7185;
                    }

                    a {
                        color: #c084fc;
                    }

                </style>

            </head>

            <body>

                <h1>
                    ❌ Login Failed
                </h1>

                <p>
                    Invalid username or password.
                </p>

                <a href="/login">
                    ← Try Again
                </a>

            </body>

            </html>
            `
        );

        return;
    }
// ===============================
// CREATE LOGIN SESSION
// ===============================

const sessionId =
    createSession(user.id);
    res.setHeader(
    "Set-Cookie",
    `sessionId=${sessionId}; HttpOnly; Path=/`
);

    sendResponse(
        res,
        200,
        `
        <!DOCTYPE html>

        <html>

        <head>

            <meta charset="UTF-8">

            <title>Login Successful</title>

            <style>

                body {
                    background: #0b0d17;
                    color: white;
                    font-family: Arial;
                    text-align: center;
                    padding: 100px;
                }

                h1 {
                    color: #86efac;
                }

                a {
                    display: inline-block;
                    margin-top: 20px;
                    padding: 14px 25px;
                    background: #8b5cf6;
                    color: white;
                    text-decoration: none;
                    border-radius: 9px;
                }

            </style>

        </head>

        <body>

            <h1>
                🎉 Login Successful!
            </h1>

            <h2>
                Welcome,
                ${escapeHTML(user.name)}
            </h2>

            <p>
                You are ready to start your mystery.
            </p>

            <a href="/hunts">
                🔎 START HUNT
            </a>
            <a href="/logout">
              🚪 LOGOUT
            </a>

        </body>

        </html>
        `
    );
}
// ===============================
// LOGOUT
// ===============================

function logoutUser(res) {

    res.writeHead(302, {
        "Set-Cookie": "sessionId=; Max-Age=0; Path=/",
        "Location": "/"
    });

    res.end();
}

// ===============================
// HUNT DETAILS
// ===============================

function huntDetailsPage(
    res,
    huntId
) {

    const data = loadData();

    const hunt =
        findHunt(data, huntId);


    if (!hunt) {

        notFound(res);
        return;
    }


    const clues =
        hunt.clues || [];


    let clueList = "";


    clues.forEach(clue => {

        clueList += `

            <div class="clue-preview">

                <strong>
                    Level ${escapeHTML(clue.level)}
                </strong>

                <p>
                    ${escapeHTML(clue.question)}
                </p>

                <span>
                    ${escapeHTML(clue.points)}
                    Points
                </span>

            </div>

        `;
    });


    const html = `

    <!DOCTYPE html>

    <html>

    <head>

        <meta charset="UTF-8">

        <meta
            name="viewport"
            content="width=device-width,
                     initial-scale=1.0"
        >

        <title>
            ${escapeHTML(hunt.title)}
        </title>


        <style>

            * {
                box-sizing: border-box;
            }

            body {
                margin: 0;
                background: #0b0d17;
                color: white;
                font-family: Arial;
            }

            nav {
                height: 75px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 8%;
                background: #111522;
            }

            nav a {
                color: white;
                text-decoration: none;
                margin-left: 25px;
            }

            .container {
                max-width: 1100px;
                margin: 50px auto;
                padding: 20px;
            }

            .hunt-box {
                background: #151a2a;
                border: 1px solid #51358a;
                border-radius: 20px;
                padding: 40px;
            }

            h1 {
                color: #d084fc;
                font-size: 45px;
            }

            .difficulty {
                display: inline-block;
                background: #8b5cf6;
                padding: 8px 18px;
                border-radius: 20px;
            }

            .description {
                color: #d1d5db;
                line-height: 1.7;
                font-size: 17px;
            }

            .clues {
                margin-top: 30px;
            }

            .clue-preview {
                background: #0f1320;
                padding: 20px;
                margin: 15px 0;
                border-radius: 12px;
                border-left: 4px solid #a855f7;
            }

            .clue-preview p {
                color: #ddd;
            }

            .clue-preview span {
                color: #c084fc;
            }

            .start-btn {
                display: inline-block;
                margin-top: 30px;
                padding: 15px 30px;
                background: #a855f7;
                color: white;
                text-decoration: none;
                border-radius: 10px;
                font-weight: bold;
            }

        </style>

    </head>


    <body>

        <nav>

            <div>
                🔐
                <strong>
                    UNLOCK THE MYSTERY
                </strong>
            </div>

            <div>

                <a href="/">
                    Home
                </a>

                <a href="/hunts">
                    Hunts
                </a>

                <a href="/login">
                    Login
                </a>

            </div>

        </nav>


        <main class="container">

            <div class="hunt-box">

                <div class="difficulty">
                    ${escapeHTML(
                        hunt.difficulty || "Mystery"
                    )}
                </div>


                <h1>
                    ${escapeHTML(hunt.title)}
                </h1>


                <p class="description">
                    ${escapeHTML(hunt.description)}
                </p>


                <p>
                    🧩 ${clues.length} Levels
                </p>


                <div class="clues">

                    <h2>
                        🔎 Mystery Levels
                    </h2>

                    ${clueList}

                </div>


                <a
                    class="start-btn"
                    href="/play/${hunt.id}"
                >
                    🔑 START HUNT
                </a>

            </div>

        </main>

    </body>

    </html>

    `;


    sendResponse(
        res,
        200,
        html
    );
}


// ===============================
// GET PLAYER
// ===============================

function getPlayer(huntId) {

    if (!players[huntId]) {

        players[huntId] = {

            level: 1,

            score: 0,

            hintsUsed: false

        };

    }

    return players[huntId];
}


// ===============================
// PLAY PAGE
// ===============================

function renderPlayPage(
    res,
    huntId
) {

    const data = loadData();

    const hunt =
        findHunt(data, huntId);


    if (!hunt) {

        notFound(res);
        return;
    }


    if (
        !hunt.clues ||
        hunt.clues.length === 0
    ) {

        sendResponse(
            res,
            404,
            "No clues available",
            "text/plain"
        );

        return;
    }


    const player =
        getPlayer(huntId);


    const clue =
        findClue(
            hunt,
            player.level
        );


    if (!clue) {

        sendResponse(
            res,
            404,
            "Clue not found",
            "text/plain"
        );

        return;
    }


    const totalLevels =
        hunt.clues.length;


    const progress =
        Math.round(
            (
                (player.level - 1)
                /
                totalLevels
            ) * 100
        );


    const html = `

    <!DOCTYPE html>

    <html>

    <head>

        <meta charset="UTF-8">

        <meta
            name="viewport"
            content="width=device-width,
                     initial-scale=1.0"
        >

        <title>
            Play |
            ${escapeHTML(hunt.title)}
        </title>


        <style>

            * {
                box-sizing: border-box;
            }

            body {
                margin: 0;
                background: #0b0d17;
                color: white;
                font-family: Arial;
            }

            .container {
                max-width: 900px;
                margin: 50px auto;
                padding: 20px;
            }

            .top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
            }

            .title {
                color: #c084fc;
                font-size: 20px;
                font-weight: bold;
            }

            .score {
                background: #151927;
                padding: 15px 22px;
                border-radius: 10px;
                color: #facc15;
            }

            .progress-text {
                display: flex;
                justify-content: space-between;
                color: #aaa;
            }

            .progress {
                height: 10px;
                background: #25283a;
                border-radius: 20px;
                overflow: hidden;
                margin: 10px 0 30px;
            }

            .progress-bar {
                width: ${progress}%;
                height: 100%;
                background: #8b5cf6;
            }

            .card {
                background: #151927;
                border: 1px solid #3b3150;
                border-radius: 20px;
                padding: 45px 30px;
                text-align: center;
            }

            .level {
                display: inline-block;
                padding: 8px 18px;
                border-radius: 25px;
                border: 1px solid #8b5cf6;
                color: #c084fc;
            }

            .icon {
                font-size: 65px;
                margin: 20px 0;
            }

            h1 {
                color: #f0c0ff;
            }

            .question {
                max-width: 700px;
                margin: 25px auto;
                font-size: 21px;
                line-height: 1.7;
                color: #ddd;
            }

            input {
                width: 90%;
                max-width: 600px;
                padding: 15px;
                background: #0d101b;
                color: white;
                border: 1px solid #4b4160;
                border-radius: 10px;
                font-size: 17px;
            }

            button {
                margin-top: 15px;
                padding: 14px 25px;
                background: #8b5cf6;
                color: white;
                border: none;
                border-radius: 9px;
                font-size: 15px;
                font-weight: bold;
                cursor: pointer;
            }

            .hint-btn {
                background: #292d42;
                margin-left: 10px;
            }

            .hint {
                display: none;
                max-width: 600px;
                margin: 25px auto 0;
                padding: 16px;
                background: #282016;
                border: 1px solid #705126;
                border-radius: 10px;
                color: #fcd34d;
            }

            @media(max-width:600px) {

                .top {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 15px;
                }

                .score {
                    width: 100%;
                }

                .card {
                    padding: 30px 18px;
                }

                .question {
                    font-size: 18px;
                }

                .hint-btn {
                    margin-left: 0;
                }

            }

        </style>

    </head>


    <body>

        <main class="container">


            <div class="top">

                <div class="title">
                    🔐
                    ${escapeHTML(hunt.title)}
                </div>


                <div class="score">
                    ⭐ Score:
                    ${player.score}
                </div>

            </div>


            <div class="progress-text">

                <span>
                    Level
                    ${player.level}
                    of
                    ${totalLevels}
                </span>

                <span>
                    ${progress}% Complete
                </span>

            </div>


            <div class="progress">

                <div class="progress-bar">
                </div>

            </div>


            <div class="card">


                <div class="level">

                    🧩 LEVEL
                    ${player.level}

                </div>


                <div class="icon">
                    🔎
                </div>


                <h1>
                    Solve the Clue
                </h1>


                <div class="question">

                    "${escapeHTML(
                        clue.question
                    )}"

                </div>


                <form
                    method="GET"
                    action="/answer/${hunt.id}"
                >

                    <input
                        type="text"
                        name="answer"
                        placeholder="Enter your answer..."
                        autocomplete="off"
                        required
                    >


                    <br>


                    <button type="submit">
                        🔓 SUBMIT ANSWER
                    </button>

                </form>


                <button
                    class="hint-btn"
                    onclick="
                        document
                        .getElementById('hint')
                        .style.display='block'
                    "
                >

                    💡 GET HINT

                </button>


                <div
                    class="hint"
                    id="hint"
                >

                    💡
                    ${escapeHTML(clue.hint)}

                </div>


            </div>


        </main>

    </body>

    </html>

    `;


    sendResponse(
        res,
        200,
        html
    );
}


// ===============================
// CHECK ANSWER
// ===============================

function checkAnswer(
    res,
    req,
    huntId,
    answer
) {

    const data = loadData();

    const hunt =
        findHunt(data, huntId);


    if (!hunt) {

        notFound(res);
        return;
    }


    const player =
        getPlayer(huntId);


    const clue =
        findClue(
            hunt,
            player.level
        );


    if (!clue) {

        sendResponse(
            res,
            404,
            "Clue not found",
            "text/plain"
        );

        return;
    }


    const userAnswer =
        String(answer || "")
            .trim()
            .toLowerCase();


    const correctAnswer =
        String(clue.answer || "")
            .trim()
            .toLowerCase();


    // WRONG ANSWER

    if (
        userAnswer !==
        correctAnswer
    ) {

        sendResponse(
            res,
            200,
            `

            <!DOCTYPE html>

            <html>

            <head>

                <meta charset="UTF-8">

                <title>
                    Wrong Answer
                </title>

            </head>


            <body style="
                background:#0b0d17;
                color:white;
                font-family:Arial;
                text-align:center;
                padding-top:120px;
            ">


                <h1 style="
                    color:#fb7185;
                ">

                    ❌ Not Quite!

                </h1>


                <p>
                    Your answer is incorrect.
                </p>


                <p>
                    Try the clue again.
                </p>


                <button
                    onclick="
                        location.href='/play/${hunt.id}'
                    "
                    style="
                        padding:15px 25px;
                        background:#8b5cf6;
                        color:white;
                        border:0;
                        border-radius:9px;
                        cursor:pointer;
                    "
                >

                    🔄 TRY AGAIN

                </button>


            </body>

            </html>

            `
        );

        return;
    }


    // CORRECT ANSWER

    let earnedPoints =
        Number(clue.points || 20);


    if (
        player.hintsUsed === true
    ) {

        earnedPoints =
            Math.floor(
                earnedPoints / 2
            );

    }


    player.score +=
        earnedPoints;


    player.hintsUsed =
        false;


    // LAST LEVEL

    if (
        player.level >=
        hunt.clues.length
    ) {

        const finalScore =
            player.score;
        const data = loadData();

const currentUser =
    getSessionUser(req);

if (currentUser) {

    const user =
        (data.users || []).find(
            u =>
                String(u.id) ===
                String(currentUser.id)
        );

    if (user) {
        user.score = finalScore;
        saveData(data);
    }
}

        delete players[huntId];


        sendResponse(
            res,
            200,
            `

            <!DOCTYPE html>

            <html>

            <head>

                <meta charset="UTF-8">

                <meta
                    name="viewport"
                    content="width=device-width,
                             initial-scale=1.0"
                >

                <title>
                    Treasure Unlocked
                </title>


                <style>

                    body {
                        margin: 0;
                        background: #0b0d17;
                        color: white;
                        font-family: Arial;
                        text-align: center;
                        padding: 100px 20px;
                    }

                    .box {
                        max-width: 700px;
                        margin: auto;
                        background: #151927;
                        padding: 50px;
                        border-radius: 20px;
                        border: 1px solid #8b5cf6;
                    }

                    h1 {
                        color: #c084fc;
                        font-size: 45px;
                    }

                    .score {
                        color: #facc15;
                        font-size: 30px;
                    }

                    a {
                        display: inline-block;
                        margin-top: 25px;
                        padding: 14px 25px;
                        background: #8b5cf6;
                        color: white;
                        text-decoration: none;
                        border-radius: 9px;
                    }

                </style>

            </head>


            <body>


                <div class="box">


                    <div style="
                        font-size:70px
                    ">

                        🏆

                    </div>


                    <h1>
                        TREASURE UNLOCKED!
                    </h1>


                    <h2>
                        ${escapeHTML(hunt.title)}
                    </h2>


                    <p>
                        Congratulations!
                        You solved every clue.
                    </p>


                    <div class="score">

                        Final Score:
                        ${finalScore}

                    </div>


                    <a href="/hunts">

                        🔍 PLAY ANOTHER HUNT

                    </a>


                </div>


            </body>

            </html>

            `
        );

        return;
    }


    // NEXT LEVEL

    player.level++;


    sendResponse(
        res,
        200,
        `

        <!DOCTYPE html>

        <html>

        <head>

            <meta charset="UTF-8">

            <title>
                Correct Answer
            </title>

        </head>


        <body style="
            background:#0b0d17;
            color:white;
            font-family:Arial;
            text-align:center;
            padding-top:120px;
        ">


            <h1 style="
                color:#86efac
            ">

                🎉 Correct!

            </h1>


            <h2>

                +${earnedPoints}
                Points

            </h2>


            <p>

                Current Score:
                ${player.score}

            </p>


            <h2>

                Level
                ${player.level}
                Unlocked!

            </h2>


            <button
                onclick="
                    location.href='/play/${hunt.id}'
                "
                style="
                    padding:15px 25px;
                    background:#8b5cf6;
                    color:white;
                    border:0;
                    border-radius:9px;
                    cursor:pointer;
                "
            >

                CONTINUE 🔓

            </button>


        </body>

        </html>

        `
    );
}


// ===============================
// CREATE SERVER
// ===============================

const server =
    http.createServer(
        (req, res) => {


            // URL

            const parsedUrl =
                url.parse(
                    req.url,
                    true
                );


            const pathname =
                parsedUrl.pathname;
// ===============================
// DELETE USER API
// ===============================

if (
    pathname.startsWith("/api/users/") &&
    req.method === "DELETE"
) {

    console.log(
        "DELETE USER REQUEST:",
        pathname
    );

    const admin =
        requireAdmin(req, res);

    if (!admin) {
        return;
    }

    const userId =
        pathname.split("/").pop();

    console.log(
        "USER ID TO DELETE:",
        userId
    );

    const data =
        loadData();

    const userIndex =
        (data.users || []).findIndex(
            user =>
                String(user.id) ===
                String(userId)
        );

    if (userIndex === -1) {

        sendResponse(
            res,
            404,
            JSON.stringify({
                message:
                    "User not found."
            }),
            "application/json"
        );

        return;
    }

    const user =
        data.users[userIndex];

    if (user.role === "admin") {

        sendResponse(
            res,
            403,
            JSON.stringify({
                message:
                    "Admin account cannot be deleted."
            }),
            "application/json"
        );

        return;
    }

    data.users.splice(
        userIndex,
        1
    );

    const saved =
        saveData(data);

    if (!saved) {

        sendResponse(
            res,
            500,
            JSON.stringify({
                message:
                    "Could not save user deletion."
            }),
            "application/json"
        );

        return;
    }

    console.log(
        "USER DELETED SUCCESSFULLY:",
        userId
    );

    sendResponse(
        res,
        200,
        JSON.stringify({
            message:
                "User deleted successfully."
        }),
        "application/json"
    );

    return;
}     
// ===============================
// ADMIN SETTINGS API
// ===============================

if (
    pathname === "/api/admin/settings" &&
    req.method === "PUT"
) {

    const admin =
        requireAdmin(req, res);

    if (!admin) {
        return;
    }

    readRequestBody(req, body => {

        try {

            const requestData =
                JSON.parse(body);

            const data =
                loadData();

            const adminUser =
                (data.users || []).find(
                    user =>
                        user.role === "admin"
                );

            if (!adminUser) {

                sendResponse(
                    res,
                    404,
                    JSON.stringify({
                        message:
                            "Admin account not found."
                    }),
                    "application/json"
                );

                return;
            }

            if (
                requestData.name &&
                requestData.name.trim()
            ) {
                adminUser.name =
                    requestData.name.trim();
            }

            if (
                requestData.username &&
                requestData.username.trim()
            ) {

                const usernameExists =
                    (data.users || []).some(
                        user =>
                            String(user.id) !==
                            String(adminUser.id) &&
                            user.username.toLowerCase() ===
                            requestData.username
                                .trim()
                                .toLowerCase()
                    );

                if (usernameExists) {

                    sendResponse(
                        res,
                        409,
                        JSON.stringify({
                            message:
                                "Username already exists."
                        }),
                        "application/json"
                    );

                    return;
                }

                adminUser.username =
                    requestData.username.trim();
            }

            if (
                requestData.password &&
                requestData.password.trim()
            ) {

                adminUser.password =
                    requestData.password.trim();
            }

            saveData(data);

            sendResponse(
                res,
                200,
                JSON.stringify({
                    message:
                        "Admin settings updated successfully."
                }),
                "application/json"
            );

        } catch (error) {

            console.log(
                "ADMIN SETTINGS ERROR:",
                error
            );

            sendResponse(
                res,
                400,
                JSON.stringify({
                    message:
                        "Invalid settings data."
                }),
                "application/json"
            );
        }

    });

    return;
}
// ===============================
// CURRENT LOGGED-IN USER API
// ===============================

if (
    pathname === "/api/current-user" &&
    req.method === "GET"
) {

    const user =
        getSessionUser(req);

    if (!user) {

        sendResponse(
            res,
            401,
            JSON.stringify({
                message: "Not logged in."
            }),
            "application/json"
        );

        return;
    }

    sendResponse(
        res,
        200,
        JSON.stringify({
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role
        }),
        "application/json"
    );

    return;
}                
// ===============================
// EDIT CLUE API
// ===============================

if (
    pathname.startsWith("/api/clues/") &&
    req.method === "PUT"
) {

    const admin = requireAdmin(req, res);

    if (!admin) {
        return;
    }

    const clueId =
        pathname.split("/").pop();

    readRequestBody(req, body => {

        try {

            const data = loadData();

            const requestData =
                JSON.parse(body);

            const hunt =
                (data.hunts || []).find(
                    h =>
                        String(h.id) ===
                        String(requestData.huntId)
                );

            if (!hunt) {

                sendResponse(
                    res,
                    404,
                    JSON.stringify({
                        message: "Hunt not found."
                    }),
                    "application/json"
                );

                return;
            }

            const clue =
                (hunt.clues || []).find(
                    c =>
                        String(c.id) ===
                        String(clueId)
                );

            if (!clue) {

                sendResponse(
                    res,
                    404,
                    JSON.stringify({
                        message: "Clue not found."
                    }),
                    "application/json"
                );

                return;
            }

            clue.question =
                requestData.question ||
                clue.question;

            clue.answer =
                requestData.answer ||
                clue.answer;

            clue.hint =
                requestData.hint ??
                clue.hint;

            clue.points =
                Number(requestData.points) ||
                clue.points ||
                20;

            saveData(data);

            sendResponse(
                res,
                200,
                JSON.stringify({
                    message:
                        "Clue updated successfully.",
                    clue: clue
                }),
                "application/json"
            );

        } catch (error) {

            console.log(
                "EDIT CLUE ERROR:",
                error
            );

            sendResponse(
                res,
                400,
                JSON.stringify({
                    message:
                        "Invalid clue data."
                }),
                "application/json"
            );
        }

    });

    return;
} 
// ===============================
// DELETE CLUE API
// ===============================

if (
    pathname.startsWith("/api/clues/") &&
    req.method === "DELETE"
) {

    const admin = requireAdmin(req, res);

    if (!admin) {
        return;
    }

    const parts =
        pathname.split("/");

    const clueId =
        parts[parts.length - 1];

    const huntId =
        parsedUrl.query.huntId;

    const data =
        loadData();

    const hunt =
        (data.hunts || []).find(
            h =>
                String(h.id) ===
                String(huntId)
        );

    if (!hunt) {

        sendResponse(
            res,
            404,
            JSON.stringify({
                message: "Hunt not found."
            }),
            "application/json"
        );

        return;
    }

    const clueIndex =
        (hunt.clues || []).findIndex(
            clue =>
                String(clue.id) ===
                String(clueId)
        );

    if (clueIndex === -1) {

        sendResponse(
            res,
            404,
            JSON.stringify({
                message: "Clue not found."
            }),
            "application/json"
        );

        return;
    }

    hunt.clues.splice(
        clueIndex,
        1
    );

    saveData(data);

    sendResponse(
        res,
        200,
        JSON.stringify({
            message:
                "Clue deleted successfully."
        }),
        "application/json"
    );

    return;
}              
 // ===============================
// ADD NEW CLUE API
// ===============================

if (
    pathname === "/api/clues" &&
    req.method === "POST"
) {

    const admin = requireAdmin(req, res);

    if (!admin) {
        return;
    }

    readRequestBody(req, body => {

        try {

            const data = loadData();

            const requestData =
                JSON.parse(body);

            const hunt =
                (data.hunts || []).find(
                    h =>
                        String(h.id) ===
                        String(requestData.huntId)
                );

            if (!hunt) {

                sendResponse(
                    res,
                    404,
                    JSON.stringify({
                        message: "Hunt not found."
                    }),
                    "application/json"
                );

                return;
            }

            if (!Array.isArray(hunt.clues)) {
                hunt.clues = [];
            }

            const newClue = {

                id:
                    hunt.clues.length + 1,

                question:
                    requestData.question || "",

                answer:
                    requestData.answer || "",

                hint:
                    requestData.hint || "",

                points:
                    Number(requestData.points) || 20
            };

            hunt.clues.push(newClue);

            saveData(data);

            sendResponse(
                res,
                201,
                JSON.stringify({
                    message:
                        "Clue added successfully.",

                    clue:
                        newClue
                }),
                "application/json"
            );

        } catch (error) {

            console.log(
                "ADD CLUE ERROR:",
                error
            );

            sendResponse(
                res,
                400,
                JSON.stringify({
                    message:
                        "Invalid clue data."
                }),
                "application/json"
            );
        }

    });

    return;
}  
             
// ===============================
// ADD NEW HUNT API
// ===============================

if (
    pathname === "/api/hunts" &&
    req.method === "POST"
) {
    const admin = requireAdmin(req, res);

    if (!admin) {
    return;
    }
    let body = "";

    req.on("data", chunk => {
        body += chunk;
    });

    req.on("end", () => {
        try {
            const newHunt = JSON.parse(body);

            if (
                !newHunt.title ||
                !newHunt.description
            ) {
                sendResponse(
                    res,
                    400,
                    JSON.stringify({
                        message: "Title and description are required."
                    }),
                    "application/json"
                );
                return;
            }

            const data = loadData();

            if (!data.hunts) {
                data.hunts = [];
            }

            const newId =
                data.hunts.length > 0
                    ? Math.max(
                        ...data.hunts.map(h => Number(h.id))
                    ) + 1
                    : 1;

            const hunt = {
                id: newId,
                title: newHunt.title,
                difficulty: newHunt.difficulty || "Easy",
                description: newHunt.description,
                clues: []
            };

            data.hunts.push(hunt);

            saveData(data);

            sendResponse(
                res,
                201,
                JSON.stringify({
                    message: "Hunt added successfully!",
                    hunt: hunt
                }),
                "application/json"
            );

        } catch (error) {
            console.log("add hunt Error :", error);
            sendResponse(
                res,
                400,
                JSON.stringify({
                    message: "Invalid data."
                }),
                "application/json"
            );
        }
    });

    return;
} 
// =====================================
// EDIT HUNT API
// =====================================

if (
    pathname.startsWith("/api/hunts/") &&
    req.method === "PUT"
) {
    const admin = requireAdmin(req, res);

    if (!admin) {
    return;
    }

    let body = "";

    req.on("data", chunk => {
        body += chunk;
    });

    req.on("end", () => {

        try {

            const huntId =
                Number(pathname.split("/").pop());

            const updatedHunt =
                JSON.parse(body);

            const data = loadData();

            const hunt =
                data.hunts.find(
                    h => Number(h.id) === huntId
                );

            if (!hunt) {

                sendResponse(
                    res,
                    404,
                    JSON.stringify({
                        message: "Hunt not found."
                    }),
                    "application/json"
                );

                return;
            }

            hunt.title =
                updatedHunt.title;

            hunt.difficulty =
                updatedHunt.difficulty || "Easy";

            hunt.description =
                updatedHunt.description;
            if (Array.isArray(updatedHunt.clues)) {
    hunt.clues = updatedHunt.clues;
}
            saveData(data);

            sendResponse(
                res,
                200,
                JSON.stringify({
                    message: "Hunt updated successfully!",
                    hunt: hunt
                }),
                "application/json"
            );

        } catch (error) {

            console.log(
                "Edit hunt error:",
                error
            );

            sendResponse(
                res,
                400,
                JSON.stringify({
                    message: "Invalid data."
                }),
                "application/json"
            );
        }
    });

    return;
}


// =====================================
// DELETE HUNT API
// =====================================

if (
    pathname.startsWith("/api/hunts/") &&
    req.method === "DELETE"
) {

    const admin = requireAdmin(req, res);

    if (!admin) {
        return;
    }

    try {

        const huntId =
            Number(pathname.split("/").pop());

        const data = loadData();

        const index =
            data.hunts.findIndex(
                h => Number(h.id) === huntId
            );

        if (index === -1) {

            sendResponse(
                res,
                404,
                JSON.stringify({
                    message: "Hunt not found."
                }),
                "application/json"
            );

            return;
        }

        data.hunts.splice(index, 1);

        saveData(data);

        sendResponse(
            res,
            200,
            JSON.stringify({
                message: "Hunt deleted successfully!"
            }),
            "application/json"
        );

    } catch (error) {

        console.log(
            "Delete hunt error:",
            error
        );

        sendResponse(
            res,
            500,
            JSON.stringify({
                message: "Could not delete hunt."
            }),
            "application/json"
        );
    }

    return;
}
// ===============================
// GET HUNTS API
// ===============================

if (
    pathname === "/api/hunts" &&
    req.method === "GET"
) {

    const data = loadData();

    const hunts =
        (data.hunts || []).map(hunt => ({
            id: hunt.id,
            title: hunt.title,
            difficulty: hunt.difficulty,
            description: hunt.description,
            clueCount: Array.isArray(hunt.clues)
                ? hunt.clues.length
                : 0
        }));

    sendResponse(
        res,
        200,
        JSON.stringify(hunts),
        "application/json"
    );

    return;
}  
           
// ===============================
// ADMIN VIEW HUNT
// ===============================

if (
    pathname.startsWith("/admin/hunt/")
    &&
    req.method === "GET"
) {
    const admin = requireAdmin(req, res);

    if (!admin) {
    return;
    }
    const huntId =
        Number(pathname.split("/").pop());

    const data = loadData();

    const hunt =
        (data.hunts || []).find(
            h => h.id === huntId
        );

    if (!hunt) {
        sendResponse(
            res,
            404,
            "Hunt not found",
            "text/plain"
        );
        return;
    }

    let html = `
<!DOCTYPE html>
<html>
<head>
    <title>${escapeHTML(hunt.title)}</title>
    <style>
        body {
            background: #120d1c;
            color: white;
            font-family: Arial, sans-serif;
            padding: 40px;
        }

        .box {
            max-width: 800px;
            margin: auto;
            padding: 30px;
            border: 1px solid #c85cff;
            border-radius: 20px;
            background: #1d1529;
        }

        h1 {
            color: #e06cff;
        }

        .difficulty {
            display: inline-block;
            background: #c85cff;
            padding: 8px 15px;
            border-radius: 20px;
        }

        .clue {
            margin-top: 20px;
            padding: 20px;
            border-radius: 15px;
            background: #291d38;
        }

        a {
            color: white;
            text-decoration: none;
        }

        .back {
            display: inline-block;
            margin-top: 25px;
            background: #c85cff;
            padding: 12px 20px;
            border-radius: 10px;
        }
    </style>
</head>

<body>

<div class="box">

    <h1>🗺️ ${escapeHTML(hunt.title)}</h1>

    <span class="difficulty">
        ${escapeHTML(hunt.difficulty)}
    </span>

    <p>
        ${escapeHTML(hunt.description)}
    </p>

    <h2>🧩 Clues</h2>
`;

    (hunt.clues || []).forEach(
        (clue, index) => {

            html += `
    <div class="clue">

        <h3>Level ${index + 1}</h3>

        <p>
            <strong>Question:</strong>
            ${escapeHTML(clue.question)}
        </p>

        <p>
            <strong>Answer:</strong>
            ${escapeHTML(clue.answer)}
        </p>

        <p>
            <strong>Hint:</strong>
            ${escapeHTML(clue.hint)}
        </p>

        <p>
            <strong>Points:</strong>
            ${clue.points}
        </p>

    </div>
`;
        }
    );

    html += `
    <a class="back" href="/manage-hunts">
        ← Back to Manage Hunts
    </a>

</div>

</body>
</html>
`;

    sendResponse(
        res,
        200,
        html,
        "text/html"
    );

    return;
}               
// ===============================
// MANAGE HUNTS PAGE
// ===============================

if (
    pathname === "/manage-hunts"
    &&
    req.method === "GET"
) {
    const admin = requireAdmin(req, res);

    if (!admin) {
    return;
    }
    const html = readHTML("manage-hunts.html");

    if (!html) {

        sendResponse(
            res,
            404,
            "Could not load manage-hunts.html",
            "text/plain"
        );

        return;
    }

    sendResponse(
        res,
        200,
        html
    );

    return;
}


// ===============================
// HUNTS API
// ===============================

if (
    pathname === "/api/hunts"
    &&
    req.method === "GET"
) {

    const data = loadData();

    const hunts =
        (data.hunts || [])
        .map(hunt => ({
            id: hunt.id,
            title: hunt.title,
            difficulty: hunt.difficulty,
            description: hunt.description,
            clueCount: Array.isArray(hunt.clues)
                ? hunt.clues.length
                : 0
        }));

    sendResponse(
        res,
        200,
        JSON.stringify(hunts),
        "application/json"
    );

    return;
}
// =====================================
// MANAGE CLUES PAGE
// =====================================

if (
    pathname === "/manage-clues" &&
    req.method === "GET"
) {
    const admin = requireAdmin(req, res);

    if (!admin) {
    return;
    }
    const html = readHTML("manage-clues.html");

    if (!html) {
        sendResponse(
            res,
            404,
            "Could not load manage-clues.html",
            "text/plain"
        );
        return;
    }

    sendResponse(
        res,
        200,
        html
    );

    return;
}


// =====================================
// CLUES API
// =====================================

if (
    pathname === "/api/clues" &&
    req.method === "GET"
) {
    const admin = requireAdmin(req, res);

    if (!admin) {
    return;
    }
    const huntId =
        parsedUrl.query.huntId;

    const data = loadData();

    const hunt =
        (data.hunts || []).find(
            h => String(h.id) === String(huntId)
        );

    if (!hunt) {

        sendResponse(
            res,
            404,
            JSON.stringify({
                message: "Hunt not found."
            }),
            "application/json"
        );

        return;
    }

    const clues =
        (hunt.clues || []).map(
            (clue, index) => ({
                id: clue.id || index + 1,
                question: clue.question || "",
                answer: clue.answer || "",
                hint: clue.hint || "",
                points: clue.points || 0
            })
        );

    sendResponse(
        res,
        200,
        JSON.stringify(clues),
        "application/json"
    );

    return;
}
 // ===============================
// ADMIN PAGE
// ===============================

if (
    pathname === "/admin"
    &&
    req.method === "GET"
) {
    const admin = requireAdmin(req, res);

    if (!admin) {
    return;
    }
    const html = readHTML("admin.html");

    if (!html) {

        sendResponse(
            res,
            404,
            "Could not load admin.html",
            "text/plain"
        );

        return;
    }

    sendResponse(
        res,
        200,
        html
    );

    return;
}  
// ===============================
// ADMIN SETTINGS PAGE
// ===============================

if (
    pathname === "/admin-settings" &&
    req.method === "GET"
) {

    const admin =
        requireAdmin(req, res);

    if (!admin) {
        return;
    }

    const html =
        readHTML("admin-settings.html");

    sendResponse(
        res,
        200,
        html,
        "text/html"
    );

    return;
}
 // ===============================
// USERS PAGE
// ===============================

if (
    pathname === "/users"
    &&
    req.method === "GET"
) {
    const admin = requireAdmin(req, res);

    if (!admin) {
    return;
    }
    const html = readHTML("users.html");

    if (!html) {

        sendResponse(
            res,
            404,
            "Could not load users.html",
            "text/plain"
        );

        return;
    }

    sendResponse(
        res,
        200,
        html
    );

    return;
}
 // ===============================
// USERS API
// ===============================

if (
    pathname === "/api/users"
    &&
    req.method === "GET"
) {
    const admin = requireAdmin(req, res);

    if (!admin) {
    return;
    }

    const data = loadData();

    const users =
        (data.users || [])
        .map(user => ({
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role,
            score: user.score || 0
        }));

    sendResponse(
        res,
        200,
        JSON.stringify(users),
        "application/json"
    );

    return;
}            
 // ===============================
// LEADERBOARD PAGE
// ===============================

if (
    pathname === "/leaderboard"
    &&
    req.method === "GET"
) {

    const html =
        readHTML("leaderboard.html");

    if (!html) {

        sendResponse(
            res,
            404,
            "Could not load leaderboard.html",
            "text/plain"
        );

        return;
    }

    sendResponse(
        res,
        200,
        html
    );

    return;
}               
                // ===============================
// LEADERBOARD API
// ===============================

if (
    pathname === "/api/leaderboard"
    &&
    req.method === "GET"
) {

    const data = loadData();

    const leaderboard =
        (data.users || [])
            .filter(
                user =>
                    user.role !== "admin"
            )
            .map(
                user => ({
                    name: user.name,
                    score: user.score || 0
                })
            )
            .sort(
                (a, b) =>
                    b.score - a.score
            );


    sendResponse(
        res,
        200,
        JSON.stringify(leaderboard),
        "application/json"
    );

    return;
}
// =========================
// REGISTER PAGE
// =========================

if (
    pathname === "/register"
    &&
    req.method === "GET"
) {

    registerPage(res);
    return;

}


// =========================
// REGISTER SUBMIT
// =========================

if (
    pathname === "/register"
    &&
    req.method === "POST"
) {

    let body = "";

    req.on(
        "data",
        chunk => {
            body += chunk.toString();
        }
    );

    req.on(
        "end",
        () => {

            const formData =
                new URLSearchParams(body);

            const name =
                formData.get("name") || "";

            const username =
                formData.get("username") || "";

            const password =
                formData.get("password") || "";

            registerUser(
                res,
                name,
                username,
                password
            );

        }
    );

    return;
}

            // =========================
            // LOGIN PAGE
            // =========================

            if (
                pathname === "/login"
                &&
                req.method === "GET"
            ) {

                loginPage(res);
                return;

            }


            // =========================
            // LOGIN SUBMIT
            // =========================

            if (
                pathname === "/login"
                &&
                req.method === "POST"
            ) {

                let body = "";


                req.on(
                    "data",
                    chunk => {

                        body +=
                            chunk.toString();

                    }
                );


                req.on(
                    "end",
                    () => {

                        const formData =
                            new URLSearchParams(
                                body
                            );


                        const username =
                            formData.get(
                                "username"
                            ) || "";


                        const password =
                            formData.get(
                                "password"
                            ) || "";


                        loginUser(
                            res,
                            username,
                            password
                        );

                    }
                );


                return;

            }
// =========================
// LOGOUT
// =========================

if (
    pathname === "/logout"
    &&
    req.method === "GET"
) {

    logoutUser(res);
    return;

}

            // =========================
            // HOME
            // =========================

            if (
                pathname === "/"
            ) {

                homePage(res);
                return;

            }


            // =========================
            // HUNTS
            // =========================

            if (
                pathname === "/hunts"
            ) {
                const user =
                requireLogin(req, res);

                if (!user) {
                return;
                }

                huntsPage(res);
                return;

            }

            // ===============================
// HUNT DETAILS
// ===============================

if (
    (pathname.startsWith("/hunts/") ||
     pathname.startsWith("/hunt/"))
    &&
    req.method === "GET"
) {

    const huntId =
        pathname.split("/")[2];
    const user =
    requireLogin(req, res);

    if (!user) {
     return;
 }
    huntDetailsPage(
        res,
        huntId
    );

    return;
}
            // =========================
            // PLAY
            // =========================

            if (
                pathname.startsWith(
                    "/play/"
                )
            ) {

                const huntId =
                    pathname.split(
                        "/"
                    )[2];
                const user =
                 requireLogin(req, res);

                if (!user) {
                return;
        }

                renderPlayPage(
                    res,
                    huntId
                );


                return;

            }


            // =========================
            // ANSWER
            // =========================

            if (
                pathname.startsWith(
                    "/answer/"
                )
            ) {

                const huntId =
                    pathname.split(
                        "/"
                    )[2];


                const answer =
                    parsedUrl
                        .query
                        .answer || "";


                checkAnswer(
                    res,
                    req,
                    huntId,
                    answer
                );


                return;

            }


            // =========================
            // 404
            // =========================

            notFound(res);

        }
    );


// ===============================
// START SERVER
// ===============================

server.listen(
    PORT,
    () => {

        console.log(
            `UNLOCK THE MYSTERY is running at http://localhost:${PORT}`
        );

    }
);