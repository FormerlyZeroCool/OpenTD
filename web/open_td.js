import { SingleTouchListener, isTouchSupported, KeyboardHandler } from './io.js';
import { RegularPolygon, getHeight, getWidth, RGB } from './gui.js';
import { random, srand, max_32_bit_signed, FixedSizeQueue } from './utils.js';
import { distance, menu_font_size, SquareAABBCollidable } from './game_utils.js';
class Projectile extends SquareAABBCollidable {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        this.base_damage = 0;
        this.bleed_damage = 0;
        this.poison_damage = 0;
        this.burn_damage = 0;
    }
    damage_enemy(enemy) {
    }
}
;
class Arrow extends Projectile {
    constructor(target, origin, x, y, width, height) {
        super(x, y, width, height);
        this.base_damage = 100;
        this.bleed_damage = 150;
        this.poison_damage = 0;
        this.burn_damage = 0;
        this.target = target;
    }
    damage_enemy(enemy) {
        enemy.add_bleed(this.bleed_damage);
        enemy.lose_hp(this.base_damage);
    }
}
;
class Tower extends SquareAABBCollidable {
    constructor(x, y, dim) {
        super(x, y, dim, dim);
    }
}
;
class Ballista extends Tower {
}
class PieceChildren {
    constructor() {
        this.left_child = null;
        this.right_child = null;
        this.top_child = null;
        this.bottom_child = null;
    }
}
class PathPiece extends SquareAABBCollidable {
    constructor(x, y, width, height, path, parent = null) {
        super(x, y, width, height);
        this.children = new PieceChildren();
        this.parent = parent;
        this.path = path;
        this.color = new RGB(0x0, 0xff, 0x0, 0xff);
        this.color_inner = new RGB(0x0, 0x0, 0xff, 0xff);
        this.polygon = new RegularPolygon(3, 3);
        this.left_initially_free = this.left_free();
        this.right_initially_free = this.right_free();
        this.top_initially_free = this.top_free();
        this.bottom_initially_free = this.bottom_free();
    }
    draw(canvas, ctx, x, y, width, height) {
        if (this.path) {
            this.polygon.sides = this.path.map.paths.indexOf(this.path) + 3;
            this.polygon.resize_radius(this.width / 2);
            ctx.fillStyle = this.color.htmlRBG();
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = "#000000";
            ctx.beginPath();
            if (!this.left_initially_free) {
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x, this.y + this.height);
            }
            if (!this.right_initially_free) {
                ctx.moveTo(this.x + this.width, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height);
            }
            if (!this.top_initially_free) {
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + this.width, this.y);
            }
            if (!this.bottom_initially_free) {
                ctx.moveTo(this.x, this.y + this.height);
                ctx.lineTo(this.x + this.width, this.y + this.height);
            }
            ctx.stroke();
        }
    }
    is_leaf() {
        return !this.children.left_child || !this.children.right_child || !this.children.top_child || !this.children.bottom_child;
    }
    left_free() {
        return !this.children.left_child;
    }
    right_free() {
        return !this.children.right_child;
    }
    top_free() {
        return !this.children.top_child;
    }
    bottom_free() {
        return !this.children.bottom_child;
    }
    try_insert_child(x, y, piece) {
        let inserted = false;
        if (x < this.mid_x() && y > this.y && this.y + this.height > y) //left
         {
            if (this.left_free() && piece.right_free()) {
                inserted = true;
                this.children.left_child = piece;
                piece.x = this.x - this.width;
                piece.y = this.y;
            }
        }
        else if (x >= this.mid_x() && y > this.y && this.y + this.height > y) //right
         {
            if (this.right_free() && piece.left_free()) {
                inserted = true;
                this.children.right_child = piece;
                piece.x = this.x + this.width;
                piece.y = this.y;
            }
        }
        else if (y < this.mid_y() && x > this.x && this.x + this.width > x) //top
         {
            if (this.top_free() && piece.bottom_free()) {
                inserted = true;
                this.children.top_child = piece;
                piece.x = this.x;
                piece.y = this.y - this.height;
            }
        }
        else if (y >= this.mid_y() && x > this.x && this.x + this.width > x) //bottom
         {
            if (this.bottom_free() && piece.top_free()) {
                inserted = true;
                this.children.bottom_child = piece;
                piece.x = this.x;
                piece.y = this.y + this.height;
            }
        }
        if (inserted && this.path?.map.check_collision_slow(piece)) {
            inserted = false;
            if (this.children.left_child === piece) {
                this.children.left_child = null;
            }
            else if (this.children.right_child === piece) {
                this.children.right_child = null;
            }
            else if (this.children.top_child === piece) {
                this.children.top_child = null;
            }
            else if (this.children.bottom_child === piece) {
                this.children.bottom_child = null;
            }
        }
        else if (inserted) {
            piece.parent = this;
            piece.path = this.path;
            this.path?.leaves.push(piece);
            if (!this.is_leaf()) {
                const index_tbd = this.path?.leaves.indexOf(this);
                if (index_tbd !== undefined && index_tbd !== -1) {
                    this.path?.leaves.splice(index_tbd, 1);
                }
            }
            this.path?.undo_stack.push(piece);
        }
        return inserted;
    }
    remove_child(tbd) {
        if (tbd === this.children.left_child) {
            this.children.left_child = null;
        }
        else if (tbd === this.children.right_child) {
            this.children.right_child = null;
        }
        else if (tbd === this.children.top_child) {
            this.children.top_child = null;
        }
        else if (tbd === this.children.bottom_child) {
            this.children.bottom_child = null;
        }
    }
}
;
class HorizontalPathPiece extends PathPiece {
    left_free() {
        return !this.children.left_child;
    }
    right_free() {
        return !this.children.right_child;
    }
    top_free() {
        return false;
    }
    bottom_free() {
        return false;
    }
}
;
class VerticalPathPiece extends PathPiece {
    draw(canvas, ctx, x, y, width, height) {
        super.draw(canvas, ctx, x, y, width, height);
        if (this.path) {
            ctx.strokeStyle = "#000000";
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x, this.y + this.height);
            ctx.moveTo(this.x + this.width, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height);
            ctx.stroke();
        }
    }
    left_free() {
        return false && !this.children.left_child;
    }
    right_free() {
        return false && !this.children.right_child;
    }
    top_free() {
        return !this.children.top_child;
    }
    bottom_free() {
        return !this.children.bottom_child;
    }
}
;
class LeftBottomPiece extends PathPiece {
    left_free() {
        return !this.children.left_child;
    }
    right_free() {
        return false && !this.children.right_child;
    }
    top_free() {
        return false && !this.children.top_child;
    }
    bottom_free() {
        return !this.children.bottom_child;
    }
}
;
class RightBottomPiece extends PathPiece {
    left_free() {
        return false && !this.children.left_child;
    }
    right_free() {
        return !this.children.right_child;
    }
    top_free() {
        return false && !this.children.top_child;
    }
    bottom_free() {
        return !this.children.bottom_child;
    }
}
;
class LeftTopPiece extends PathPiece {
    left_free() {
        return !this.children.left_child;
    }
    right_free() {
        return false && !this.children.right_child;
    }
    top_free() {
        return !this.children.top_child;
    }
    bottom_free() {
        return false && !this.children.bottom_child;
    }
}
;
class RightTopPiece extends PathPiece {
    left_free() {
        return false && !this.children.left_child;
    }
    right_free() {
        return !this.children.right_child;
    }
    top_free() {
        return !this.children.top_child;
    }
    bottom_free() {
        return false && !this.children.bottom_child;
    }
}
;
class Path {
    constructor(x, y, width, height, map) {
        this.map = map;
        this.cell_width = width;
        this.cell_height = height;
        this.undo_stack = [];
        this.root = new PathPiece(x, y, this.cell_width, this.cell_height, this);
        this.root.children.left_child = new PathPiece(x + this.cell_width, y, this.cell_width, this.cell_height, this, this.root);
        this.leaves = [this.root.children.left_child];
    }
    undo_add() {
        if (this.undo_stack.length > 0) {
            const tbd = this.undo_stack.pop();
            const parent = tbd.parent;
            this.leaves.splice(this.leaves.indexOf(tbd), 1);
            if (this.leaves.indexOf(parent) === -1)
                this.leaves.push(parent);
            parent.remove_child(tbd);
            return tbd;
        }
        return null;
    }
    check_collision_slow(collidable) {
        let result = false;
        this.traverse((piece) => { if (collidable.check_collision(piece) && collidable !== piece)
            result = true; });
        return result;
    }
    pick_random_leaf() {
        const index = Math.floor(random() * this.leaves.length);
        return index < this.leaves.length ? this.leaves[index] : null;
    }
    find_nearest_leaf(search_point, nearest = this.root) {
        let nearest_dist = distance(nearest, search_point);
        /*for(let i = this.leaves.length; i > 0; i--)
        {
            const leaf = this.leaves[i - 1];
            const current_dist = distance(leaf, search_point);
            if(nearest_dist > current_dist)
            {
                nearest = leaf;
                nearest_dist = current_dist;
            }
        }*/
        this.traverse((piece) => {
            const current_dist = distance(piece, search_point);
            if (nearest_dist > current_dist) {
                nearest = piece;
                nearest_dist = current_dist;
            }
        });
        return nearest.is_leaf() ? nearest : null;
    }
    traverse(apply) {
        const stack = [];
        stack.push(this.root);
        while (stack.length > 0) {
            const current = stack.pop();
            apply(current);
            for (const el in current.children) {
                const piece = current.children[el];
                if (piece !== null)
                    stack.push(piece);
            }
        }
    }
    draw(canvas, ctx, x, y, width, height) {
        this.traverse((current) => current.draw(canvas, ctx, x, y, width, height));
        ctx.strokeRect(this.root.x, this.root.y, this.root.width, this.root.height);
    }
}
;
class Enemy extends SquareAABBCollidable {
    constructor(x, y, width, height, current_target) {
        super(x, y, width, height);
        this.game = current_target.path?.map.game;
        this.direction = [10, 0];
        this.current_target = current_target;
        this.attack = 1;
        this.defense_magic = 0.05;
        this.defense_fire = 0.05;
        this.defense_poison = 0.05;
        this.defense_physical = 0.05;
        this.shield_magic = 0;
        this.shield_fire = 0;
        this.shield_poison = 0;
        this.shield_physical = 0;
        this.hp = 0;
        this.buildup_bleed = 0;
        this.buildup_burn = 0;
        this.buildup_poison = 0;
    }
    take_damage(proj) {
        proj.damage_enemy(this);
        if (this.hp <= 0)
            return false;
        return true;
    }
    apply_poison(delta_time) {
        if (this.buildup_poison > 0) {
            this.buildup_poison -= this.game.damage_poison_per_sec * delta_time * 1 / 1000;
            if (this.buildup_poison < 0) {
                this.shield_poison += this.buildup_poison;
                this.buildup_poison = 0;
            }
            this.shield_poison -= this.game.damage_poison_per_sec * delta_time * 1 / 1000;
            if (this.shield_poison < 0) {
                this.hp += this.shield_poison;
                this.shield_poison = 0;
            }
        }
    }
    apply_burn(delta_time) {
        if (this.buildup_burn > 0) {
            this.buildup_burn -= this.game.damage_burn_per_sec * delta_time * 1 / 1000;
            if (this.buildup_burn < 0) {
                this.shield_fire += this.buildup_burn * (1 - this.defense_fire);
                this.buildup_burn = 0;
            }
            this.shield_fire -= this.game.damage_burn_per_sec * (1 - this.defense_fire) * delta_time * 1 / 1000;
            if (this.shield_fire < 0) {
                this.hp += this.shield_fire * (1 - this.defense_fire);
                this.shield_fire = 0;
            }
        }
    }
    apply_bleed(delta_time) {
        if (this.buildup_bleed > 0) {
            this.buildup_bleed -= this.game.damage_bleed_per_sec * delta_time * 1 / 1000;
            if (this.buildup_bleed < 0) {
                this.shield_physical += this.buildup_bleed * (1 - this.defense_physical);
                this.buildup_bleed = 0;
            }
            this.shield_physical -= this.game.damage_bleed_per_sec * (1 - this.defense_physical) * delta_time * 1 / 1000;
            if (this.shield_physical < 0) {
                this.hp += this.shield_physical * (1 - this.defense_physical);
                this.shield_physical = 0;
            }
        }
    }
    lose_hp(damage) {
        if (this.hp > 0) {
            this.shield_physical -= damage * (1 - this.defense_physical);
            if (this.shield_physical < 0) {
                this.shield_physical *= 1 / (1 - this.defense_physical);
                this.shield_fire += this.shield_physical * (1 - this.defense_fire);
                this.shield_physical = 0;
            }
            if (this.shield_fire < 0) {
                this.shield_fire *= 1 / (1 - this.defense_fire);
                this.shield_poison += this.shield_fire * (1 - this.defense_poison);
                this.shield_fire = 0;
            }
            if (this.shield_poison < 0) {
                this.shield_poison *= 1 / (1 - this.defense_poison);
                this.shield_magic += this.shield_poison * (1 - this.defense_magic);
                this.shield_poison = 0;
            }
            if (this.shield_magic < 0) {
                this.shield_magic *= 1 / (1 - this.defense_magic);
                this.hp += this.shield_magic * (1 - this.defense_physical);
                this.shield_magic = 0;
            }
        }
    }
    add_poison(damage) {
        this.buildup_poison += damage;
    }
    add_burn(damage) {
        this.buildup_burn += damage;
    }
    add_bleed(damage) {
        this.buildup_bleed += damage;
    }
    update_state(delta_time) {
        if (this.hp > 0) {
            this.apply_poison(delta_time);
            this.apply_burn(delta_time);
            this.apply_bleed(delta_time);
        }
        this.set_direction_vector_to_face(this.current_target);
        if (this.distance(this.current_target) < 10) {
            if (this.current_target.parent) {
                this.current_target = this.current_target.parent;
            }
            else {
                this.game.lives -= this.attack * delta_time * 1 / 1000;
            }
        }
        super.update_state(delta_time);
    }
    draw(canvas, ctx, x, y, width, height) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}
;
class Map {
    constructor(x, y, game) {
        const min_dim = 50;
        this.game = game;
        this.enemies = [];
        this.last_updated = [];
        this.cell_dim = min_dim;
        this.paths = [new Path(x, y, min_dim, min_dim, this)];
        this.piece_types = [HorizontalPathPiece, VerticalPathPiece, LeftBottomPiece, RightBottomPiece];
    }
    undo() {
        if (this.last_updated.length > 0) {
            const path = this.last_updated.pop();
            path.undo_add();
        }
    }
    try_add_piece(x, y) {
        const piece = new this.piece_types[Math.floor(random() * this.piece_types.length)](x, y, this.cell_dim, this.cell_dim, null, null);
        for (let i = 0; i < this.paths.length; i++) {
            const path = this.paths[i];
            const leaf = path.find_nearest_leaf(piece);
            if (leaf && leaf.try_insert_child(x, y, piece)) {
                this.last_updated.push(path);
                return true;
            }
        }
        return false;
    }
    pick_random_path() {
        return this.paths[Math.floor(random() * this.paths.length)];
    }
    add_random_enemy() {
        const type_index = Math.floor(random() * this.game.enemy_types.length);
        const path = this.pick_random_path();
        const leaf = path.pick_random_leaf();
        const enemy = new this.game.enemy_types[type_index](leaf.mid_x(), leaf.mid_y() - 12.5, 25, 25, leaf);
        this.enemies.push(enemy);
    }
    check_collision_slow(collidable) {
        for (let i = 0; i < this.paths.length; i++) {
            if (this.paths[i].check_collision_slow(collidable)) {
                return true;
            }
        }
        return false;
    }
    update_state(delta_time) {
        this.enemies.forEach(enemy => enemy.update_state(delta_time));
    }
    draw(canvas, ctx, x, y, width, height) {
        this.paths.forEach(path => path.draw(canvas, ctx, x, y, width, height));
        this.enemies.forEach(enemy => enemy.draw(canvas, ctx, x, y, width, height));
    }
}
;
class Game extends SquareAABBCollidable {
    constructor(starting_lives, x, y, width, height) {
        super(x, y, width, height);
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.max_x = 4000;
        this.max_y = 4000;
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
        this.enemy_types = [Enemy];
        this.map = new Map(this.x_translation, this.y_translation, this);
        this.restart_game();
        this.map.add_random_enemy();
    }
    restart_game() {
    }
    init(width, height, cell_width, cell_height) {
    }
    trasform_x_to_world_space(x) {
        return x / this.scale + this.x_translation;
    }
    trasform_y_to_world_space(y) {
        return y / this.scale + this.y_translation;
    }
    try_add_piece(x, y) {
        const inv_scale = 1 / this.scale;
        x = this.trasform_x_to_world_space(x);
        y = this.trasform_y_to_world_space(y);
        return this.map.try_add_piece(x, y);
    }
    resize(width, height) {
        this.width = width;
        this.height = height;
    }
    draw(canvas, ctx, x, y, width, height) {
        const inv_scale = 1 / this.scale;
        this.ctx.clearRect(0, 0, this.max_x, this.max_y);
        this.map.draw(this.canvas, this.ctx, 0, 0, this.max_x, this.max_y);
        ctx.drawImage(this.canvas, this.x_translation, this.y_translation, width * inv_scale, height * inv_scale, x, y, width, height);
    }
    update_state(delta_time) {
        this.map.update_state(delta_time);
    }
}
;
const keyboardHandler = new KeyboardHandler();
async function main() {
    const canvas = document.getElementById("screen");
    const touchListener = new SingleTouchListener(canvas, true, true, false);
    canvas.width = getWidth();
    canvas.height = getHeight();
    canvas.style.cursor = "pointer";
    let counter = 0;
    const touchScreen = isTouchSupported();
    let height = getHeight();
    let width = getWidth();
    let game = new Game(3, 0, 0, height, width);
    window.game = game;
    canvas.addEventListener("wheel", (e) => {
        //e.preventDefault();
        game.scale += e.deltaY / 100;
    });
    let low_fps = false;
    touchListener.registerCallBack("touchend", (event) => true, (event) => {
        if (game.try_add_piece(event.touchPos[0], event.touchPos[1]))
            console.log("added");
        else
            console.log("nnoooot");
        game.map.add_random_enemy();
    });
    touchListener.registerCallBack("touchmove", (event) => true, (event) => {
        const inv_scale = 1 / game.scale;
        game.x_translation -= event.deltaX * inv_scale;
        game.y_translation -= event.deltaY * inv_scale;
    });
    //setInterval(() => {for(let i = 0; i < 200; i++) game.add_ball(); game.balls.forEach(ball => ball.release());}, 50)
    keyboardHandler.registerCallBack("keydown", () => true, (event) => {
        if (!keyboardHandler.keysHeld["MetaLeft"] && !keyboardHandler.keysHeld["ControlLeft"] &&
            !keyboardHandler.keysHeld["MetaRight"] && !keyboardHandler.keysHeld["ControlRight"])
            event.preventDefault();
        switch (event.code) {
        }
    });
    keyboardHandler.registerCallBack("keydown", (e) => true, event => {
        if (keyboardHandler.keysHeld["ControlLeft"] || keyboardHandler.keysHeld["ControlRight"] ||
            keyboardHandler.keysHeld["MetaLeft"] || keyboardHandler.keysHeld["MetaRight"]) {
            switch (event.code) {
                case ('KeyC'):
                    break;
                case ('KeyV'):
                    break;
                case ('KeyZ'):
                    game.map.undo();
                    break;
                case ('KeyY'):
                    break;
            }
        }
    });
    let maybectx = canvas.getContext("2d");
    if (!maybectx)
        return;
    const ctx = maybectx;
    let start = Date.now();
    let dt = 1;
    const ostart = Date.now();
    let frame_count = 0;
    let instantaneous_fps = 0;
    const time_queue = new FixedSizeQueue(60 * 2);
    const header = document.getElementById("header");
    srand(Math.random() * max_32_bit_signed);
    const drawLoop = () => {
        frame_count++;
        //do stuff and render here
        if (getWidth() !== width) {
            width = getWidth();
            height = getHeight() - header.clientHeight - 150;
            game.resize(width, height);
            canvas.width = width;
            canvas.height = height;
        }
        dt = Date.now() - start;
        time_queue.push(dt);
        start = Date.now();
        let sum = 0;
        let highest = 0;
        for (let i = 0; i < time_queue.length; i++) {
            const value = time_queue.get(i);
            sum += value;
            if (highest < value) {
                highest = value;
            }
        }
        if (dt < 1000) {
            game.update_state(dt);
        }
        ctx.fillStyle = "#000000";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        game.draw(canvas, ctx, game.x, game.y, canvas.width, canvas.height);
        if (frame_count % 10 === 0)
            instantaneous_fps = Math.floor(1000 / (low_fps ? highest : dt));
        let text = "";
        ctx.fillStyle = "#FFFFFF";
        text = `avg fps: ${Math.floor(1000 * time_queue.length / sum)}, ${low_fps ? "low" : "ins"} fps: ${instantaneous_fps}`;
        const text_width = ctx.measureText(text).width;
        ctx.strokeText(text, game.width - text_width - 10, menu_font_size());
        ctx.fillText(text, game.width - text_width - 10, menu_font_size());
        requestAnimationFrame(drawLoop);
    };
    drawLoop();
    game.resize(width, height - header.clientHeight - 150);
}
main();
