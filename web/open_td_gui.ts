import { SimpleGridLayoutManager } from "./gui.js";
import { throw_error_unimplemented_virtual_method } from './utils'
import { SingleTouchListener, TouchMoveEvent } from './io'
import { Game } from './open_td'
//all persistent state should be stored in static variables
//this includes ui elements because constructing new ui elements and destroying old ones is not free
export interface UIState {
    //render any ui elements to provided context
    draw(ctx:CanvasRenderingContext2D, canvas:HTMLCanvasElement, x:number, y:number, width:number, height:number):void;
    //pass keyboard events to any ui elements managed
    handleKeyboardEvents(type:string, event:KeyboardEvent):void;
    //pass touch events to any ui elements managed
    handleTouchEvents(type:string, event:TouchMoveEvent):void;
    //update state, and transition state, every tick new state will be assigned to current state
    //to remain in previous state return this object
    transition(delta_time:number):UIState;
};
export class StateManagedUI {
    state:UIState;
    constructor(state:UIState)
    {
        this.state = state;
    }
    draw(ctx:CanvasRenderingContext2D, canvas:HTMLCanvasElement, x:number, y:number, width:number, height:number):void
    {
        this.state.draw(ctx, canvas, x, y, width, height);
    }
    handleKeyboardEvents(type:string, event:KeyboardEvent):void
    {
        this.state.handleKeyboardEvents(type, event);
    }
    handleTouchEvents(type:string, event:TouchMoveEvent):void
    {
        this.state.handleTouchEvents(type, event);
    }
    transition(delta_time:number):void
    {
        this.state = this.state.transition(delta_time);
    }
};

export class StateManagedUIElement implements UIState {
    layouts:SimpleGridLayoutManager[];
    constructor()
    {
        this.layouts = [];
    }
    draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, x: number, y: number, width: number, height: number): void {
        this.layouts.forEach(layout => layout.draw(ctx));
    }
    handleKeyboardEvents(type: string, event: KeyboardEvent): void {
        this.layouts.forEach(layout => layout.handleKeyBoardEvents(type, event));
    }
    handleTouchEvents(type: string, event: TouchMoveEvent): void {
        this.layouts.forEach(layout => layout.handleTouchEvents(type, event));
    }
    transition(delta_time: number): UIState {
        throw new Error("Method not implemented.");
    }
    
    
}
//always show
const hud = new SimpleGridLayoutManager([0, 0], [0, 0], 0, 0);
//ui group 0
const tower_selector = new SimpleGridLayoutManager([0, 0], [0, 0], 0, 0);
const path_piece_selector = new SimpleGridLayoutManager([0, 0], [0, 0], 0, 0);
//state managed ui group 1
//Nothing transitions self, TowerUpdrageUI, Victory, Loss
//state TowerUpgradeUI transitions self, Nothing, Victory, Loss
const tower_updater_right = new SimpleGridLayoutManager([0, 0], [0, 0], 0, 0);
const targeting_menu = new SimpleGridLayoutManager([0, 0], [0, 0], 0, 0);
//state Victory transitions self, Nothing
const victory_screen = new SimpleGridLayoutManager([0, 0], [0, 0], 0, 0);
//state Loss Transitions to self, Nothing
const loss_screen = new SimpleGridLayoutManager([0, 0], [0, 0], 0, 0);
export class PlacePathState extends StateManagedUIElement {
    game:Game;
    possible_change:boolean;
    constructor(game:Game)
    {
        super();
        this.possible_change = false;
        this.game = game;
        this.layouts.push(hud);
        this.layouts.push(path_piece_selector);
    }
    handleTouchEvents(type: string, event: TouchMoveEvent): void {
        super.handleTouchEvents(type, event);
        if(type === "touchend")
        {
            this.game.map.add_random_enemy();
            this.game.try_add_piece(event.touchPos[0], event.touchPos[1]);
        }
    }
    transition(delta_time: number): UIState {
        if(this.game.keyboardHandler.keysHeld["KeyD"])
            return new DefaultGameState(this.game);
        return this;
    }
}
export class DefaultGameState extends StateManagedUIElement {
    game:Game;
    possible_change_to_place_pieces:boolean;
    constructor(game:Game)
    {
        super();
        this.possible_change_to_place_pieces = false;
        this.game = game;
        this.layouts.push(hud);
        this.layouts.push(tower_selector);
    }
    handleTouchEvents(type: string, event: TouchMoveEvent): void {
        super.handleTouchEvents(type, event);

        console.log(this.game.try_place_ballista(event.touchPos[0], event.touchPos[1]));
    }
    transition(delta_time: number): UIState {
        if(this.game.keyboardHandler.keysHeld["KeyP"])
        {
            return new PlacePathState(this.game);
        }
        else if(this.game.selected_tower)
        {
            return new TowerInfoState(this.game);
        }
        else if(this.game.has_won_level())
        {
            return new VictoryState(this.game);
        }
        else if(this.game.has_lost_level())
        {
            return new LossState(this.game);
        }
        
        return this;
    }
};
export class TowerInfoState extends DefaultGameState {
    constructor(game:Game)
    {
        super(game);
        this.layouts.push(tower_updater_right);
        this.layouts.push(targeting_menu);
        const tower = game.selected_tower!;
        tower_updater_right.x = game.transform_x_to_screen_space(tower.x + tower.width);
        tower_updater_right.y = game.transform_y_to_screen_space(tower.y);
        targeting_menu.x = game.transform_x_to_screen_space(tower.x - targeting_menu.width());
        targeting_menu.y = game.transform_y_to_screen_space(tower.y);
    }
    transition(delta_time: number): UIState {

        const tower = this.game.selected_tower;
        if(tower)
        {
            tower_updater_right.x = this.game.transform_x_to_screen_space(tower.x + tower.width);
            tower_updater_right.y = this.game.transform_y_to_screen_space(tower.y);
            targeting_menu.x = this.game.transform_x_to_screen_space(tower.x - targeting_menu.width());
            targeting_menu.y = this.game.transform_y_to_screen_space(tower.y);
            return this;
        }
        else
        {
            return super.transition(delta_time);
        }
    }
}
export class VictoryState extends DefaultGameState {
    constructor(game:Game)
    {
        super(game);
        this.layouts.push(victory_screen);
    }
}
export class LossState extends DefaultGameState {
    constructor(game:Game)
    {
        super(game);
        this.layouts.push(loss_screen);
    }
}