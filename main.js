import Matter from 'matter-js';
import { FRUITS, GAME_WIDTH, GAME_HEIGHT, WALL_THICKNESS } from './src/constants';

// Module aliases
const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Events = Matter.Events,
    World = Matter.World,
    Body = Matter.Body;

const engine = Engine.create();
const world = engine.world;
let render;
let runner;
let currentFruitType = null;
let ghostBody = null; // The static body used for aiming
let nextFruitType = FRUITS[0];
let disableAction = false;
let score = 0;

const gameContainer = document.getElementById('game-container');
const scoreElement = document.getElementById('score');
const nextFruitImg = document.getElementById('next-fruit-img');

function init() {
    const containerWidth = gameContainer.clientWidth;
    const containerHeight = gameContainer.clientHeight;

    // Rendering
    render = Render.create({
        element: gameContainer,
        engine: engine,
        options: {
            width: containerWidth,
            height: containerHeight,
            wireframes: false,
            background: '#fff0f5', // match css
            pixelRatio: window.devicePixelRatio,
        },
    });

    // Walls
    const ground = Bodies.rectangle(
        containerWidth / 2,
        containerHeight + WALL_THICKNESS / 2 - 10,
        containerWidth,
        WALL_THICKNESS,
        { isStatic: true, label: 'wall', render: { fillStyle: '#8d6e63' } }
    );

    const leftWall = Bodies.rectangle(
        0 - WALL_THICKNESS / 2,
        containerHeight / 2,
        WALL_THICKNESS,
        containerHeight * 2,
        { isStatic: true, label: 'wall', render: { fillStyle: '#8d6e63' } }
    );

    const rightWall = Bodies.rectangle(
        containerWidth + WALL_THICKNESS / 2,
        containerHeight / 2,
        WALL_THICKNESS,
        containerHeight * 2,
        { isStatic: true, label: 'wall', render: { fillStyle: '#8d6e63' } }
    );

    World.add(world, [ground, leftWall, rightWall]);

    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);

    updateNextFruitDisp();
    prepareNewFruit();

    // Input Listeners
    // Use simple singular event handlers to avoid duplicates
    gameContainer.onmousemove = (e) => handleMove(e.clientX);
    gameContainer.ontouchmove = (e) => {
        e.preventDefault();
        handleMove(e.touches[0].clientX);
    };

    gameContainer.onmousedown = (e) => handleInputDown(e.clientX);
    gameContainer.ontouchstart = (e) => {
        // e.preventDefault(); // Don't prevent default on start, generally
        handleInputDown(e.touches[0].clientX);
    };

    // Release on window to capture drags that go outside
    window.onmouseup = () => handleRelease();
    window.ontouchend = () => handleRelease();

    // Collision
    Events.on(engine, 'collisionStart', handleCollision);
}

function prepareNewFruit() {
    if (ghostBody) return;

    currentFruitType = nextFruitType;
    updateNextFruitDisp();

    // Position aim at top center
    const x = gameContainer.clientWidth / 2;
    const y = 80;

    // Create Ghost Body (Sensor + Static)
    ghostBody = Bodies.circle(x, y, currentFruitType.radius, {
        label: 'ghost',
        isStatic: true,
        isSensor: true,
        render: {
            opacity: 0.7, // Slightly transparent to indicate aim state
            sprite: {
                texture: currentFruitType.img,
                xScale: (currentFruitType.radius * 2) / 1024,
                yScale: (currentFruitType.radius * 2) / 1024,
            }
        }
    });

    World.add(world, ghostBody);
}

function updateNextFruitDisp() {
    const maxIndex = 3;
    const randomIndex = Math.floor(Math.random() * (maxIndex + 1));
    nextFruitType = FRUITS[randomIndex];
    nextFruitImg.src = nextFruitType.img;
}

function handleMove(clientX) {
    if (disableAction || !ghostBody) return;

    const rect = gameContainer.getBoundingClientRect();
    let x = clientX - rect.left;

    // Clamp x
    const radius = currentFruitType.radius;
    if (x < radius + WALL_THICKNESS / 2) x = radius + WALL_THICKNESS / 2;
    if (x > rect.width - radius - WALL_THICKNESS / 2) x = rect.width - radius - WALL_THICKNESS / 2;

    Body.setPosition(ghostBody, { x: x, y: 80 });
}

function handleInputDown(clientX) {
    if (disableAction || !ghostBody) return;
    // Just move the fruit to finger/cursor on down press
    handleMove(clientX);
}

function handleRelease() {
    if (disableAction || !ghostBody) return;

    console.log('Dropping fruit!');
    disableAction = true;

    const dropX = ghostBody.position.x;
    const dropY = ghostBody.position.y;

    // Remove Ghost
    World.remove(world, ghostBody);
    ghostBody = null;

    // Create Real Dynamic Body
    addFruit(dropX, dropY, currentFruitType);

    setTimeout(() => {
        disableAction = false;
        prepareNewFruit();
    }, 500); // Wait a bit before spawning next
}

function getFruitTypeIndex(label) {
    return FRUITS.findIndex(f => f.label === label);
}

function addFruit(x, y, fruitType) {
    const body = Bodies.circle(x, y, fruitType.radius, {
        label: fruitType.label,
        restitution: 0.2,
        density: 0.001, // Ensure standard density
        friction: 0.1,
        render: {
            sprite: {
                texture: fruitType.img,
                xScale: (fruitType.radius * 2) / 1024,
                yScale: (fruitType.radius * 2) / 1024,
            }
        }
    });

    World.add(world, body);
}

function handleCollision(event) {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
        const { bodyA, bodyB } = pairs[i];

        // Ignore ghosts
        if (bodyA.label === 'ghost' || bodyB.label === 'ghost') continue;
        if (bodyA.label === 'wall' || bodyB.label === 'wall') continue;

        if (bodyA.label === bodyB.label) {
            const index = getFruitTypeIndex(bodyA.label);

            // If valid merge
            if (index !== -1 && index < FRUITS.length - 1) {
                World.remove(world, [bodyA, bodyB]);

                // Midpoint
                const x = (bodyA.position.x + bodyB.position.x) / 2;
                const y = (bodyA.position.y + bodyB.position.y) / 2;

                // New fruit
                const newFruit = FRUITS[index + 1];
                addFruit(x, y, newFruit);

                score += newFruit.score;
                scoreElement.textContent = score;
            }
        }
    }
}

init();
