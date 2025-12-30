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
let currentBody = null;
let currentFruitType = null;
let nextFruitType = FRUITS[0]; // Start with cherry
let disableAction = false;
let score = 0;

const gameContainer = document.getElementById('game-container');
const scoreElement = document.getElementById('score');
const nextFruitImg = document.getElementById('next-fruit-img');

function init() {
    // Mobile responsive dimensions
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
    createNewFruit();

    // Inputs
    gameContainer.addEventListener('mousemove', handleMove);
    gameContainer.addEventListener('touchmove', (e) => {
        e.preventDefault();
        handleMove(e.touches[0]);
    }, { passive: false });

    gameContainer.addEventListener('mouseup', handleRelease);
    gameContainer.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleRelease(e);
    }, { passive: false });

    // Collision
    Events.on(engine, 'collisionStart', handleCollision);
}

function createNewFruit() {
    if (currentBody) return;

    currentFruitType = nextFruitType;
    updateNextFruitDisp();

    // Position it at top center initially
    const x = gameContainer.clientWidth / 2;
    const y = 80;

    currentBody = Bodies.circle(x, y, currentFruitType.radius, {
        label: currentFruitType.label,
        isStatic: true, // Holds in place
        isSensor: true, // Won't collide
        render: {
            sprite: {
                texture: currentFruitType.img,
                xScale: (currentFruitType.radius * 2) / 1024,
                yScale: (currentFruitType.radius * 2) / 1024,
            }
        }
    });

    World.add(world, currentBody);
}

function updateNextFruitDisp() {
    const maxIndex = 3;
    const randomIndex = Math.floor(Math.random() * (maxIndex + 1));
    nextFruitType = FRUITS[randomIndex];
    nextFruitImg.src = nextFruitType.img;
}

function handleMove(e) {
    if (disableAction || !currentBody) return;

    const rect = gameContainer.getBoundingClientRect();
    let x = e.clientX - rect.left;

    // Clamp x
    const radius = currentFruitType.radius;
    if (x < radius + WALL_THICKNESS / 2) x = radius + WALL_THICKNESS / 2;
    if (x > rect.width - radius - WALL_THICKNESS / 2) x = rect.width - radius - WALL_THICKNESS / 2;

    Body.setPosition(currentBody, { x: x, y: 80 });
}

function handleRelease(e) {
    if (disableAction || !currentBody) return;

    disableAction = true;

    Body.setStatic(currentBody, false);
    Body.set(currentBody, { isSensor: false });

    currentBody = null;

    setTimeout(() => {
        disableAction = false;
        createNewFruit();
    }, 1000);
}

function getFruitTypeIndex(label) {
    return FRUITS.findIndex(f => f.label === label);
}

function addFruit(x, y, fruitType) {
    const body = Bodies.circle(x, y, fruitType.radius, {
        label: fruitType.label,
        restitution: 0.2, // Bounciness
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

        if (bodyA.label === bodyB.label) {
            const index = getFruitTypeIndex(bodyA.label);

            // If it's not the last fruit ('watermelon' or index 10)
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
