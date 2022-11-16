import { GuiButton, SimpleGridLayoutManager } from "./gui.js";
import { throw_error_unimplemented_virtual_method } from './utils.js'
import { SingleTouchListener, TouchMoveEvent } from './io.js'
import { Game } from './open_td.js'
import { UIState, StateManagedUI, StateManagedUIElement } from './gui.js'

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