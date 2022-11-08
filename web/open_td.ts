import {SingleTouchListener, TouchMoveEvent, MouseDownTracker, isTouchSupported, KeyboardHandler} from './io.js'
import {RegularPolygon, getHeight, getWidth, RGB, Sprite, blendAlphaCopy} from './gui.js'
import {random, srand, max_32_bit_signed, FixedSizeQueue, Queue, PriorityQueue, DynamicInt32Array} from './utils.js'
import {SquareAABBCollidable, menu_font_size} from './game_utils.js'
import {Projectile, Map, Enemy, Tower, PathPiece,
    VerticalPathPiece, LeftBottomPiece, RightBottomPiece, 
    LeftTopPiece, RightTopPiece, TBottomPiece, TTopPiece, TLeftPiece, TRightPiece, Target} from './open_td_engine.js'
import { StateManagedUI, DefaultGameState, PlacePathState } from './open_td_gui.js'

//example of how to create a new enemy class, override draw method to draw your own graphics
class BasicEnemy extends Enemy {
    static last_hp = 0;
    constructor(x:number, y:number, width:number, height:number, current_target:PathPiece)
    {
        super(x, y, width, height, current_target);
        this.hp = (++BasicEnemy.last_hp) * 10;
        //this.shield_physical += random() * 3000;
    }
};
//example of how to create a new Projectile class, override draw method to draw your own graphics
class Arrow extends Projectile {
    constructor(target:Target, origin:SquareAABBCollidable, x:number, y:number, width:number, height:number)
    {
        super(target, origin, x, y, width, height);
        this.base_damage = 100; 
        this.bleed_damage = 150;
        this.poison_damage = 0;
        this.burn_damage = 0;
        this.direction = [500, 1];
        this.target = target;
    }
    damage_enemy(enemy:Enemy):void
    {
        console.log("enemy hit!", enemy.hp);
        enemy.add_bleed(this.bleed_damage);
        enemy.lose_hp(this.base_damage);
    }
    update_state(delta_time: number): void {
        super.update_state(delta_time);
    }
    draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
        ctx.fillStyle = "#00FFF0";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
};
//example of how to create a new tower class, override draw method to draw your own graphics
class Ballista extends Tower {
    constructor(game:Game, x:number, y:number, dim:number, range:number, projectile_type:typeof Projectile)
    {
        super(game, x, y, dim, range, <typeof Projectile> Arrow);
        this.fire_rate = 1;
        this.targeting_strategy = Tower.target_highest_hp;
    }
    draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}
//example of how to create a new path piece class, override draw method to draw your own graphics
//a path piece is a single piece of a path each one can render how it chooses and choose what sides 
//are open to start with
class HorizontalPathPiece extends PathPiece {

    left_free():boolean
    {
        return super.left_free();
    }
    right_free():boolean
    {
        return super.right_free();
    }
    top_free():boolean
    {
        return false;
    }
    bottom_free():boolean
    {
        return false;
    }
};

export class Game extends SquareAABBCollidable {
    keyboardHandler:KeyboardHandler;
    max_x:number;
    max_y:number;
    cell_dim:number;
    spatial_map_dim:number;
    x_translation:number;
    y_translation:number;
    scale:number;
    damage_bleed_per_sec:number;
    damage_magic_per_sec:number;
    damage_poison_per_sec:number;
    damage_burn_per_sec:number;
    enemy_types:typeof Enemy[];
    tower_types:typeof Tower[];
    piece_types:typeof PathPiece[];
    selected_tower:Tower | null;
    level:number;
    level_enemy_queue:Queue<Enemy>;
    lives:number;
    map:Map;
    canvas:HTMLCanvasElement;
    ctx:CanvasRenderingContext2D;
    ui_state_machine:StateManagedUI;
    delta_x:number;
    delta_y:number;
    constructor(keyboardHandler:KeyboardHandler, starting_lives:number, x:number, y:number, width:number, height:number)
    {
        super(x, y, width, height);
        this.keyboardHandler = keyboardHandler;
        this.delta_x = 0;
        this.delta_y = 0;
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d")!;
        this.ui_state_machine = new StateManagedUI(new DefaultGameState(this));
        this.selected_tower = null;
        this.level_enemy_queue = new Queue<Enemy>();
        this.level = 0;
        this.max_x = 4000;
        this.max_y = 4000;
        this.spatial_map_dim = 50;
        this.cell_dim = this.max_x / this.spatial_map_dim;
        this.canvas.width = this.max_x;
        this.canvas.height = this.max_y;
        this.x_translation = Math.floor(this.max_x / 2);
        this.y_translation = Math.floor(this.max_y / 2);
        this.scale = 0.5;
        this.lives = starting_lives;
        this.damage_bleed_per_sec = 50;
        this.damage_burn_per_sec = 50;
        this.damage_magic_per_sec = 50;
        this.damage_poison_per_sec = 100;
        this.enemy_types = [BasicEnemy];
        this.tower_types = [Ballista];       
        this.piece_types = [HorizontalPathPiece, VerticalPathPiece, LeftBottomPiece, RightBottomPiece, 
            LeftTopPiece, RightTopPiece, TBottomPiece, TTopPiece, TLeftPiece, TRightPiece];
        this.map = new Map(this.x_translation, this.y_translation, this);
        //this.restart_game();
        this.map.add_random_enemy();
    }
    has_won_level():boolean
    {
        return this.map.enemies.length === 0 && this.level_enemy_queue.length === 0 && this.lives > 0;
    }
    has_lost_level():boolean
    {
        return this.lives <= 0;
    }
    add_tower_type(tower_type:typeof Tower):void
    {
        this.tower_types.push(tower_type);
    }
    restart_game():void
    {
        throw Error("unimplemented method");
    }
    init(width:number, height:number, cell_width:number, cell_height:number):void
    {
        throw Error("unimplemented method");
    }
    trasform_x_to_world_space(x:number):number
    {
        return x / this.scale + this.x_translation;
    }
    trasform_y_to_world_space(y:number):number
    {
        return y / this.scale + this.y_translation;
    }
    transform_x_to_screen_space(x:number):number
    {
        return (x - this.x_translation) * this.scale;
    }
    transform_y_to_screen_space(y:number):number
    {
        return (y - this.y_translation) * this.scale;
    }
    try_add_piece(x:number, y:number):boolean
    {
        const inv_scale = 1/this.scale;
        x = this.trasform_x_to_world_space(x);
        y = this.trasform_y_to_world_space(y);
        return this.map.try_add_piece(x, y);
    }
    try_place_ballista(x:number, y:number):boolean
    {
        const inv_scale = 1/this.scale;
        x = this.trasform_x_to_world_space(x);
        y = this.trasform_y_to_world_space(y);
        return this.map.try_place_tower(new Ballista(this, x, y, this.cell_dim, 5, Arrow));
    }
    resize(width:number, height:number):void
    {
        this.width = width;
        this.height = height;
    }
    draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void 
    {
        ctx.imageSmoothingEnabled = false;
        this.ctx.imageSmoothingEnabled = false;
        const inv_scale = 1/this.scale;
        this.ctx.clearRect(0, 0, this.max_x, this.max_y);
        this.map.draw(this.canvas, this.ctx, 0, 0, this.max_x, this.max_y);
        ctx.drawImage(this.canvas, this.x_translation, this.y_translation, width * inv_scale, height * inv_scale, x, y, width, height);
        //this.ui_state_machine.draw(ctx, canvas, x, y, width, height);
    }
    update_state(delta_time: number): void 
    {
        this.x_translation += this.delta_x;
        this.y_translation += this.delta_y;
        this.ui_state_machine.transition(delta_time);
        this.map.update_state(delta_time);
    }
};
const keyboardHandler = new KeyboardHandler();
async function main()
{
    const canvas:HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("screen");
    const touchListener = new SingleTouchListener(canvas, true, true, false);


    canvas.width = getWidth();
    canvas.height = getHeight();
    canvas.style.cursor = "pointer";
    let counter = 0;
    const touchScreen:boolean = isTouchSupported();
    let height = getHeight();
    let width = getWidth();
    let game = new Game(keyboardHandler, 3, 0, 0, height, width);
    window.game = game;
    canvas.addEventListener("wheel", (e) => {
        //e.preventDefault();
        game.scale += e.deltaY / 100;
        if(game.scale < 0.2)
        {
            game.scale = 0.2;
        }
        else if(game.scale > 15)
        {
            game.scale = 15;
        }
    });
    let low_fps:boolean = false;
    touchListener.registerCallBack("touchstart", (event:any) => keyboardHandler.keysHeld["ControlLeft"] || keyboardHandler.keysHeld["ControlRight"] ||
    keyboardHandler.keysHeld["MetaLeft"] || keyboardHandler.keysHeld["MetaRight"], (event:any) => {
    });
    touchListener.registerCallBack("touchstart", (event:any) => !(keyboardHandler.keysHeld["ControlLeft"] || keyboardHandler.keysHeld["ControlRight"] ||
    keyboardHandler.keysHeld["MetaLeft"] || keyboardHandler.keysHeld["MetaRight"]), (event:any) => {
        //game.ui_state_machine.state = new DefaultGameState(game);
    });
    touchListener.registerCallBack("touchend", (event) => true, (event:TouchMoveEvent) => {
        game.ui_state_machine.handleTouchEvents("touchend", event);
    })
    touchListener.registerCallBack("touchmove", (event:any) => true, (event:any) => {
        const inv_scale = 1 / game.scale;
        game.x_translation -= event.deltaX * inv_scale;
        game.y_translation -= event.deltaY * inv_scale;
        game.ui_state_machine.handleTouchEvents("touchmove", event);
    });
    //setInterval(() => {for(let i = 0; i < 200; i++) game.add_ball(); game.balls.forEach(ball => ball.release());}, 50)
    keyboardHandler.registerCallBack("keydown", () => true, (event:any) => {
        if(!keyboardHandler.keysHeld["MetaLeft"] && !keyboardHandler.keysHeld["ControlLeft"] &&
            !keyboardHandler.keysHeld["MetaRight"] && !keyboardHandler.keysHeld["ControlRight"])
            event.preventDefault();
        game.ui_state_machine.handleKeyboardEvents("keydown", event);
        const change = 30;
        switch(event.code)
        {
            case("ArrowLeft"):
                game.delta_x = -change;
            break;
            case("ArrowRight"):
                game.delta_x = change;
            break;
            case("ArrowUp"):
                game.delta_y = -change;
            break;
            case("ArrowDown"):
                game.delta_y = change;
            break;
        }
    });    
    keyboardHandler.registerCallBack("keyup", () => true, (event:any) => {
        game.ui_state_machine.handleKeyboardEvents("keyup", event);
        switch(event.code)
        {
            case("ArrowLeft"):
            if(game.delta_x < 0)
                game.delta_x = 0;
            break;
            case("ArrowRight"):
            if(game.delta_x > 0)
                game.delta_x = 0;
            break;
            case("ArrowUp"):
            if(game.delta_y < 0)
                game.delta_y = 0;
            break;
            case("ArrowDown"):
            if(game.delta_y > 0)
                game.delta_y = 0;
            break;
        }
    });      
    keyboardHandler.registerCallBack("keydown", (e:any) => true, event => {
        if(keyboardHandler.keysHeld["ControlLeft"] || keyboardHandler.keysHeld["ControlRight"] ||
            keyboardHandler.keysHeld["MetaLeft"] || keyboardHandler.keysHeld["MetaRight"]){
            switch(event.code) {
            case('KeyC'):
            break;
            case('KeyV'):
            break;
            case('KeyZ'):
            game.map.undo();
            break;
            case('KeyY'):
            break;
            }
        }
    });
    let maybectx:CanvasRenderingContext2D | null = canvas.getContext("2d");
    if(!maybectx)
        return;
    const ctx:CanvasRenderingContext2D = maybectx;
    let start = Date.now();
    let dt = 1;
    const ostart = Date.now();
    let frame_count = 0;
    let instantaneous_fps = 0;
    const time_queue:FixedSizeQueue<number> = new FixedSizeQueue<number>(60 * 2);
    const header = document.getElementById("header");
    srand(Math.random() * max_32_bit_signed);


    const drawLoop = () => 
    {
        frame_count++;
        //do stuff and render here
        if(getWidth() !== width)
        {
            width = getWidth();
            height = getHeight() - header!.clientHeight - 150;
            game.resize(width, height);
            canvas.width = width;
            canvas.height = height;
        }

        dt = Date.now() - start;
        time_queue.push(dt);
        start = Date.now();
        let sum = 0;
        let highest = 0;
        for(let i = 0; i < time_queue.length; i++)
        {
            const value = time_queue.get(i);
            sum += value;
            if(highest < value)
            {
                highest = value;
            }
        }
        if(dt < 1000)
        {
            game.update_state(dt);
        }
        ctx.fillStyle = "#000000";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        game.draw(canvas, ctx, game.x, game.y, canvas.width, canvas.height);
        if(frame_count % 10 === 0)
            instantaneous_fps = Math.floor(1000 / (low_fps?highest:dt));
        let text = "";
        ctx.fillStyle = "#FFFFFF";
        text = `avg fps: ${Math.floor(1000 * time_queue.length / sum)}, ${low_fps?"low":"ins"} fps: ${instantaneous_fps}`;
        const text_width = ctx.measureText(text).width;
        ctx.strokeText(text, game.width - text_width - 10, menu_font_size());
        ctx.fillText(text, game.width - text_width - 10, menu_font_size());

        requestAnimationFrame(drawLoop);
    }
    drawLoop();
    game.resize(width, height - header!.clientHeight - 150);

}
main();