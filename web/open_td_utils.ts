import {SingleTouchListener, TouchMoveEvent, MouseDownTracker, isTouchSupported, KeyboardHandler} from './io.js'
import {RegularPolygon, getHeight, getWidth, RGB, Sprite, blendAlphaCopy} from './gui.js'
import {random, srand, max_32_bit_signed, FixedSizeQueue, Queue, PriorityQueue, DynamicInt32Array} from './utils.js'
import {non_elastic_no_angular_momentum_bounce_vector, get_normal_vector_aabb_rect_circle_collision, magnitude, dot_product_2d, scalar_product_2d, normalize2D, distance, GameObject, menu_font_size, SpatiallyMappableCircle, SpatialHashMap2D, SquareAABBCollidable, Circle, manhattan_distance } from './game_utils.js'
import {Game} from './open_td.js'
export class Projectile extends SquareAABBCollidable {
    
    target:SquareAABBCollidable | null;
    origin:SquareAABBCollidable;
    bleed_damage:number;
    poison_damage:number;
    burn_damage:number;
    base_damage:number;


    constructor(target:SquareAABBCollidable | null, origin:SquareAABBCollidable, x:number, y:number, width:number, height:number)
    {
        super(x, y, width, height);
        this.target = target;
        this.origin = origin;
        this.target = null;
        this.base_damage = 0; 
        this.bleed_damage = 0;
        this.poison_damage = 0;
        this.burn_damage = 0;
    }
    is_at_target(): boolean 
    {
        if(this.target)
        {
            const dist = distance(this, this.target);
            if(dist < Math.min(this.target.width, this.target.height) / 4)
            {
                return true;
            }
        }
        return false;
    }
    update_state(delta_time: number): void {
        if(this.target)
        {
            this.set_direction_vector_to_face(this.target);
        }
        super.update_state(delta_time);
    }
    damage_enemy(enemy:Enemy):void
    {

    }
};
export class Range <T> extends SpatiallyMappableCircle
{
    range_for:T
    constructor(x:number, y:number, radius:number, range_for:T)
    {
        super(x, y, radius);
        this.range_for = range_for;
    }
};
export class Tower extends SquareAABBCollidable {
    game:Game;
    range:Range<Tower>;
    range_map_space:number;
    fire_rate:number;
    last_fired:number;
    projectile_type:typeof Projectile;
    closest:Target | null;
    highest_hp:Target | null;
    highest_shield_magic:Target | null;
    highest_shield_fire:Target | null;
    highest_shield_poison:Target | null;
    highest_shield_physical:Target | null;
    targeting_strategy:number;
    static target_closest:number = 0;
    static target_highest_hp:number = 1;
    static target_highest_shield_magic:number = 2;
    static target_highest_shield_fire:number = 3;
    static target_highest_shield_poison:number = 4;
    static target_highest_shield_physical:number = 5;
    constructor(game:Game, x:number, y:number, dim:number, range:number, projectile_type:typeof Projectile)
    {
        super(x, y, dim, dim);
        this.projectile_type = projectile_type;
        this.closest = null;
        this.highest_hp = null;
        this.highest_shield_magic = null;
        this.highest_shield_fire = null;
        this.highest_shield_poison = null;
        this.highest_shield_physical = null;
        this.targeting_strategy = Tower.target_closest;
        this.game = game;
        this.fire_rate = 1;
        this.range_map_space = range;
        this.range = new Range<Tower>(this.x, this.y, this.width * range, this);
        this.last_fired = Date.now();
    }
    clear_targets():void
    {    
        this.closest = null;
        this.highest_hp = null;
        this.highest_shield_magic = null;
        this.highest_shield_fire = null;
        this.highest_shield_poison = null;
        this.highest_shield_physical = null;
    }
    fire_projectile(projectile:Projectile):void
    {
        projectile.x = this.mid_x();
        projectile.y = this.mid_y();
        switch(this.targeting_strategy)
        {
            case(Tower.target_closest):
            if(this.closest)
            {
                projectile.target = this.closest;
                this.game.map.add_projectile(projectile);
                console.log("projectile launched at closest!", this.closest)
            }
            break;
            case(Tower.target_highest_hp):
            if(this.highest_hp)
            {
                projectile.target = this.highest_hp;
                this.game.map.add_projectile(projectile);
                console.log("projectile launched!")
            }
            break;
            case(Tower.target_highest_shield_fire):
            if(this.highest_shield_fire)
            {
                projectile.target = this.highest_shield_fire;
                this.game.map.add_projectile(projectile);
                console.log("projectile launched!")
            }
            break;
            case(Tower.target_highest_shield_magic):
            if(this.highest_shield_magic)
            {
                projectile.target = this.highest_shield_magic;
                this.game.map.add_projectile(projectile);
                console.log("projectile launched!")
            }
            break;
            case(Tower.target_highest_shield_physical):
            if(this.highest_shield_physical)
            {
                projectile.target = this.highest_shield_physical;
                this.game.map.add_projectile(projectile);
                console.log("projectile launched!")
            }
            break;
            case(Tower.target_highest_shield_poison):
            if(this.highest_shield_poison)
            {
                projectile.target = this.highest_shield_poison;
                this.game.map.add_projectile(projectile);
                console.log("projectile launched!")
            }
            break;
        }
        
    }
    update_state(delta_time: number): void {
        const current_time = Date.now();
        if(current_time - this.last_fired > this.fire_rate * 1000)
        {
            this.fire_projectile(new this.projectile_type(null, this, this.x, this.y, this.width / 4, this.height / 4));
            this.last_fired = current_time;
        }
    }
};
export class PieceChildren {
    left_child:PathPiece | null;
    right_child:PathPiece | null;
    bottom_child:PathPiece | null;
    top_child:PathPiece | null;
    constructor()
    {
        this.left_child = null;
        this.right_child = null;
        this.top_child = null;
        this.bottom_child = null;
    }
}
export class PathPiece extends SquareAABBCollidable {
    path:Path | null;
    parent:PathPiece | null;
    children:PieceChildren;
    color:RGB;
    color_inner:RGB;
    polygon:RegularPolygon;
    left_initially_free:boolean;
    right_initially_free:boolean;
    top_initially_free:boolean;
    bottom_initially_free:boolean;
    
    constructor(x:number, y:number, width:number, height:number, path:Path | null, parent:PathPiece | null = null)
    {
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
    draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
        if(this.path)
        {
            this.polygon.sides = this.path.map.paths.indexOf(this.path) + 3;
            this.polygon.resize_radius(this.width / 2);
            ctx.fillStyle = this.color.htmlRBG();
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = "#000000";
            ctx.beginPath();
            if(!this.left_initially_free)
            {
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x, this.y + this.height);
            }
            if(!this.right_initially_free)
            {
                ctx.moveTo(this.x + this.width, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height);
            }
            if(!this.top_initially_free)
            {
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + this.width, this.y);
            }
            if(!this.bottom_initially_free)
            {
                ctx.moveTo(this.x, this.y + this.height);
                ctx.lineTo(this.x + this.width, this.y + this.height);
            }
            ctx.stroke();
        }
    }
    is_leaf():boolean
    {
        let is_leaf = false;
        if(this.path)
        {
            if(this.left_empty())
                is_leaf = true;
            else if(this.right_empty())
                is_leaf = true;
            else if(this.top_empty())
                is_leaf = true;
            else if(this.bottom_empty())
                is_leaf = true;
        }
        return is_leaf;
    }
    left_empty():boolean
    {
        return this.left_free() && !this.path!.map.check_collision_fast(
            new SquareAABBCollidable(this.x - this.width, this.y, this.width, this.height));
    }
    right_empty():boolean
    {
        return this.right_free() && !this.path!.map.check_collision_fast(
            new SquareAABBCollidable(this.x + this.width, this.y, this.width, this.height));
    }
    top_empty():boolean
    {
        return this.top_free() && !this.path!.map.check_collision_fast(
            new SquareAABBCollidable(this.x, this.y - this.height, this.width, this.height));
    }
    bottom_empty():boolean
    {
        return this.bottom_free() && !this.path!.map.check_collision_fast(
            new SquareAABBCollidable(this.x, this.y + this.height, this.width, this.height));
    }
    left_free():boolean
    {
        return !this.children.left_child;
    }
    right_free():boolean
    {
        return !this.children.right_child;
    }
    top_free():boolean
    {
        return !this.children.top_child;
    }
    bottom_free():boolean
    {
        return !this.children.bottom_child;
    }
    position_open(pos:SquareAABBCollidable):string | null
    {

        if(pos.x <= this.mid_x() && pos.y >= this.y && this.y + this.height >= pos.y)//left
        { 
            if(this.left_free())
            {
                return "left_child";
            }
        }
        else if(pos.x >= this.mid_x() && pos.y >= this.y && this.y + this.height >= pos.y)//right
        {
            if(this.right_free())
            {
                return "right_child";
            }
        }
        else if(pos.y <= this.mid_y() && pos.x >= this.x && this.x + this.width >= pos.x)//top
        {
            if(this.top_free())
            {
                return "top_child";
            }
        }
        else if(pos.y >= this.mid_y() && pos.x >= this.x && this.x + this.width >= pos.x)//bottom
        {
            if(this.bottom_free())
            {
                return "bottom_child";
            }
        }
        return null;
    }
    child_bounding_box(child:string):SquareAABBCollidable
    {
        if(child === "left_child")
        {
            return new SquareAABBCollidable(this.x - this.width, this.y, this.width, this.height);
        }
        else if(child === "right_child")
        {
            return new SquareAABBCollidable(this.x + this.width, this.y, this.width, this.height);
        }
        else if(child === "top_child")
        {
            return new SquareAABBCollidable(this.x, this.y - this.height, this.width, this.height);
        }
        else if(child === "bottom_child")
        {
            return new SquareAABBCollidable(this.x, this.y + this.height, this.width, this.height);
        }
        else 
            throw "error invalid child: "+child;
    }
    try_add_random():void
    {
        const possible_sides = <any[]>[];
        for(const key in this.children)
        {
            if(this.children[key] === null && this.path && !this.path.map.check_collision_fast(this.child_bounding_box(key)))
            {
                possible_sides.push(key);
            }
        }
        const key = possible_sides[Math.floor(random() * possible_sides.length)];
        
        if(key)
        {
            if(key === "left_child")
            {
                console.log(this.children[key], key)
                const types = this.path!.map.piece_types.filter(
                    (value, index, arr) => this.path!.map.piece_type_instances[index].right_initially_free);
                const type = types[Math.floor(random() * types.length)];
                if(type)
                {
                    this.children[key] = new type(this.x - this.width, this.y, this.width, this.height, this.path, this);
                }
            }
            else if(key === "right_child")
            {
                const types = this.path!.map.piece_types.filter(
                    (value, index, arr) => this.path!.map.piece_type_instances[index].left_initially_free)

                const type = types[Math.floor(random() * types.length)];
                if(type)
                {
                    this.children[key] = new type(this.x + this.width, this.y, this.width, this.height, this.path, this);
                    console.log(this.children[key].left_free())
                }
            }
            else if(key === "top_child")
            {
                const types = this.path!.map.piece_types.filter(
                    (value, index, arr) => this.path!.map.piece_type_instances[index].bottom_initially_free);
                const type = types[Math.floor(random() * types.length)];
                if(type)
                {
                    this.children[key] = new type(this.x, this.y - this.height, this.width, this.height, this.path, this);
                }
            }
            else if(key === "bottom_child")
            {
                const types = this.path!.map.piece_types.filter(
                    (value, index, arr) => this.path!.map.piece_type_instances[index].top_initially_free);
                const type = types[Math.floor(random() * types.length)];
                if(type)
                {
                    this.children[key] = new type(this.x, this.y + this.height, this.width, this.height, this.path, this);
                }
            }
            if(this.path!.map.check_collision_fast(this.children[key]))
            {
                if(this.children.left_child === this.children[key])
                {
                    this.children.left_child = null;
                }
                else if(this.children.right_child === this.children[key])
                {
                    this.children.right_child = null;
                }
                else if(this.children.top_child === this.children[key])
                {
                    this.children.top_child = null;
                }
                else if(this.children.bottom_child === this.children[key])
                {
                    this.children.bottom_child = null;
                }
            }
            else if(this.children[key].is_leaf() && this.path)
            {
                this.path!.leaves.push(this.children[key]);
                this.path.map.last_updated.push(this.path);
                this.path.undo_stack.push(this.children[key]);
                this.path!.map.set_piece_on_cell(this.children[key].x, this.children[key].y);
            }
            if(!this.is_leaf() && this.path)
            {
                const index = this.path!.leaves.indexOf(this);
                if(index !== -1)
                {
                    this.path.leaves.splice(index, 1);
                }
            }
        }
    }
    try_insert_child(x:number, y:number, piece:PathPiece):number
    {
        let inserted = 0;
        if(x <= this.mid_x() && y >= this.y && this.y + this.height >= y)//left
        { 
            if(this.left_free() && piece.right_free())
            {
                inserted = 1;
                this.children.left_child = piece;
                piece.x = this.x - this.width;
                piece.y = this.y;
            }
        }
        else if(x >= this.mid_x() && y >= this.y && this.y + this.height >= y)//right
        {
            if(this.right_free() && piece.left_free())
            {
                inserted = 2;
                this.children.right_child = piece;
                piece.x = this.x + this.width;
                piece.y = this.y;
            }
        }
        else if(y <= this.mid_y() && x >= this.x && this.x + this.width >= x)//top
        {
            if(this.top_free() && piece.bottom_free())
            {
                inserted = 3;
                this.children.top_child = piece;
                piece.x = this.x;
                piece.y = this.y - this.height;
            }
        }
        else if(y >= this.mid_y() && x >= this.x && this.x + this.width >= x)//bottom
        {
            if(this.bottom_free() && piece.top_free())
            {
                inserted = 4;
                this.children.bottom_child = piece;
                piece.x = this.x;
                piece.y = this.y + this.height;
            }
        }
        if(this.path)
        if(inserted && this.path.map.check_collision_fast(piece))
        {
            inserted = 0;
            this.remove_child(piece);
        }
        else if(inserted)
        {
            piece.parent = this;
            piece.path = this.path;
            this.path.leaves.push(piece);
            if(!this.is_leaf())
            {
                const index_tbd = this.path.leaves.indexOf(this);
                if(index_tbd !== -1)
                {
                    this.path.leaves.splice(index_tbd, 1);
                }
            }
            this.path.undo_stack.push(piece);
            this.path.map.set_piece_on_cell(piece.x, piece.y);
        }
        return inserted;
    }
    remove_child(tbd:PathPiece, clear_map:boolean = false):void
    {
        if(tbd === this.children.left_child)
        {
            this.children.left_child = null;
        }
        else if(tbd === this.children.right_child)
        {
            this.children.right_child = null;
        }
        else if(tbd === this.children.top_child)
        {
            this.children.top_child = null;
        }
        else if(tbd === this.children.bottom_child)
        {
            this.children.bottom_child = null;
        }
        if(clear_map)
            this.path!.map.clear_piece_on_cell(this.x, this.y);
    }
};
export class VerticalPathPiece extends PathPiece {
    left_free():boolean
    {
        return false && super.left_free();
    }
    right_free():boolean
    {
        return false && super.right_free();
    }
    top_free():boolean
    {
        return super.top_free();
    }
    bottom_free():boolean
    {
        return super.bottom_free();
    }
};
export class LeftBottomPiece extends PathPiece {

    left_free():boolean
    {
        return super.left_free();
    }
    right_free():boolean
    {
        return false && super.right_free();
    }
    top_free():boolean
    {
        return false && super.top_free();
    }
    bottom_free():boolean
    {
        return super.bottom_free();
    }
};
export class RightBottomPiece extends PathPiece {

    left_free():boolean
    {
        return false && super.left_free();
    }
    right_free():boolean
    {
        return super.right_free();
    }
    top_free():boolean
    {
        return false && super.top_free();
    }
    bottom_free():boolean
    {
        return super.bottom_free();
    }
};
export class LeftTopPiece extends PathPiece {

    left_free():boolean
    {
        return super.left_free();
    }
    right_free():boolean
    {
        return false && super.right_free();
    }
    top_free():boolean
    {
        return super.top_free();
    }
    bottom_free():boolean
    {
        return false && super.bottom_free();
    }
};
export class RightTopPiece extends PathPiece {

    left_free():boolean
    {
        return false && super.left_free();
    }
    right_free():boolean
    {
        return super.right_free();
    }
    top_free():boolean
    {
        return super.top_free();
    }
    bottom_free():boolean
    {
        return false && super.bottom_free();
    }
};
export class TBottomPiece extends PathPiece {

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
        return false && super.top_free();
    }
    bottom_free():boolean
    {
        return super.bottom_free();
    }
};
export class TTopPiece extends PathPiece {

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
        return super.top_free();
    }
    bottom_free():boolean
    {
        return false && super.bottom_free();
    }
};
export class TLeftPiece extends PathPiece {

    left_free():boolean
    {
        return super.left_free();
    }
    right_free():boolean
    {
        return false && super.right_free();
    }
    top_free():boolean
    {
        return super.top_free();
    }
    bottom_free():boolean
    {
        return super.bottom_free();
    }
};
export class TRightPiece extends PathPiece {

    left_free():boolean
    {
        return false && super.left_free();
    }
    right_free():boolean
    {
        return super.right_free();
    }
    top_free():boolean
    {
        return super.top_free();
    }
    bottom_free():boolean
    {
        return super.bottom_free();
    }
};
export class Target extends SquareAABBCollidable {
    value:number;
    constructor(x:number, y:number, dim:number, value:number)
    {
        super(x, y, dim, dim);
        this.value = value;
    }
}
export class Path {
    map:Map;
    undo_stack:PathPiece[];
    leaves:PathPiece[];
    root:PathPiece;
    cell_width:number;
    cell_height:number;
    game:Game;
    constructor(x:number, y:number, width:number, height:number, map:Map)
    {
        this.map = map;
        this.cell_width = width;
        this.cell_height = height;
        this.undo_stack = [];
        x -= x % this.cell_width;
        y -= y % this.cell_height;
        this.root = new PathPiece(x, y, this.cell_width, this.cell_height, this);
        this.root.children.left_child = new PathPiece(x + this.cell_width, y, this.cell_width, this.cell_height, this, this.root);
        this.leaves = [this.root.children.left_child];
    }
    undo_add():PathPiece | null
    {
        if(this.undo_stack.length > 0)
        {
            const tbd = this.undo_stack.pop()!;
            const parent = tbd.parent!;
            this.leaves.splice(this.leaves.indexOf(tbd), 1);
            if(this.leaves.indexOf(parent) === -1)
                this.leaves.push(parent);
            parent.remove_child(tbd, true);
            this.map.clear_piece_on_cell(tbd.x, tbd.y);
            return tbd;
        }
        return null;
    }
    check_collision_slow(collidable:SquareAABBCollidable):PathPiece | null
    {
        let result:PathPiece | null = null;
        this.traverse((piece) => {
            if(collidable.check_collision(piece) && collidable !== piece) 
                result = piece 
        });
        return result;
    }
    pick_random_leaf(): PathPiece | null
    {
        this.leaves = [];
        this.traverse((piece) => {
            if(piece.is_leaf())
                this.leaves.push(piece);
        });
        const index = Math.floor(random() * this.leaves.length);
        return index < this.leaves.length ? this.leaves[index] : null;
    }
    find_nearest_open_leaf(search_point:SquareAABBCollidable, nearest:PathPiece = this.root):PathPiece | null
    {
        let nearest_dist = distance(nearest, search_point);
        this.traverse((piece) => {
            const current_dist = distance(piece, search_point);
            if(nearest_dist > current_dist && !this.map.check_collision_fast(search_point))
            {
                nearest = piece;
                nearest_dist = current_dist;
            }
        })
        return nearest.is_leaf() ? nearest : null;
    }
    find_nearest_leaf(search_point:SquareAABBCollidable, nearest:PathPiece = this.root):PathPiece | null
    {
        let nearest_dist = distance(nearest, search_point);
        this.traverse((piece) => {
            const current_dist = distance(piece, search_point);
            if(nearest_dist > current_dist)
            {
                nearest = piece;
                nearest_dist = current_dist;
            }
        })
        return nearest//nearest.is_leaf() ? nearest : null;
    }
    traverse(apply:(element:PathPiece) => void):void
    {
        const stack = <Array<PathPiece> > [];
        
        stack.push(this.root);
        while(stack.length > 0)
        {
            const current = stack.pop()!;
            apply(current);
            for(const el in current.children)
            {
                const piece:PathPiece = current.children[el];
                if(piece !== null)
                    stack.push(piece);
            }
        }

    }
    breadth_first_traverse(apply:(element:PathPiece) => void):void
    {
        const queue = new Queue<PathPiece>();
        
        queue.push(this.root);
        while(queue.length > 0)
        {
            const current = queue.pop()!;
            apply(current);
            for(const el in current.children)
            {
                const piece:PathPiece = current.children[el];
                if(piece !== null)
                    queue.push(piece);
            }
        }

    }
    draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
        
        this.traverse((current) => current.draw(canvas, ctx, x, y, width, height));
        ctx.strokeRect(this.root.x, this.root.y, this.root.width, this.root.height);
    }
};
export class Enemy extends SquareAABBCollidable {
    defense_magic:number;
    defense_fire:number;
    defense_poison:number;
    defense_physical:number;
    shield_magic:number;
    shield_fire:number;
    shield_poison:number;
    shield_physical:number;
    hp:number;
    buildup_burn:number;
    buildup_poison:number;
    buildup_bleed:number;
    game:Game;
    current_target:PathPiece;
    attack:number;
    constructor(x:number, y:number, width:number, height:number, current_target:PathPiece)
    {
        super(x, y, width, height);
        this.game = current_target.path?.map.game!;
        this.direction = [30,0];
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
        this.hp = 1;
        this.buildup_bleed = 0;
        this.buildup_burn = 0;
        this.buildup_poison = 0;
    }
    take_damage(proj:Projectile):boolean
    {
        proj.damage_enemy(this);
        if(this.hp <= 0)
            return false;
        return true;
    }
    apply_poison(delta_time:number):void
    {
        if(this.buildup_poison > 0)
        {
            this.buildup_poison -= this.game.damage_poison_per_sec * delta_time * 1 / 1000;
            if(this.buildup_poison < 0)
            {
                this.shield_poison += this.buildup_poison;
                this.buildup_poison = 0;
            }
            this.shield_poison -= this.game.damage_poison_per_sec * delta_time * 1 / 1000;
            if(this.shield_poison < 0)
            {
                this.hp += this.shield_poison;
                this.shield_poison = 0;
            }
        }
    }
    apply_burn(delta_time:number):void
    {
        if(this.buildup_burn > 0)
        {
            this.buildup_burn -= this.game.damage_burn_per_sec * delta_time * 1 / 1000;
            if(this.buildup_burn < 0)
            {
                this.shield_fire += this.buildup_burn * (1 - this.defense_fire);
                this.buildup_burn = 0;
            }
            this.shield_fire -= this.game.damage_burn_per_sec  * (1 - this.defense_fire) * delta_time * 1 / 1000;
            if(this.shield_fire < 0)
            {
                this.hp += this.shield_fire * (1 - this.defense_fire);
                this.shield_fire = 0;
            }
        }
    }
    apply_bleed(delta_time:number):void
    {
        if(this.buildup_bleed > 0)
        {
            this.buildup_bleed -= this.game.damage_bleed_per_sec * delta_time * 1 / 1000;
            if(this.buildup_bleed < 0)
            {
                this.shield_physical += this.buildup_bleed * (1 - this.defense_physical);
                this.buildup_bleed = 0;
            }
            this.shield_physical -= this.game.damage_bleed_per_sec  * (1 - this.defense_physical) * delta_time * 1 / 1000;
            if(this.shield_physical < 0)
            {
                this.hp += this.shield_physical * (1 - this.defense_physical);
                this.shield_physical = 0;
            }
        }
    }
    lose_hp(damage:number):void
    {
        if(this.hp > 0)
        {
            this.shield_physical -= damage * (1 - this.defense_physical);
            if(this.shield_physical < 0)
            {
                this.shield_physical *= 1 / (1 - this.defense_physical);
                this.shield_fire += this.shield_physical * (1 - this.defense_fire);
                this.shield_physical = 0;
            }
            if(this.shield_fire < 0)
            {
                this.shield_fire *= 1 / (1 - this.defense_fire);
                this.shield_poison += this.shield_fire * (1 - this.defense_poison);
                this.shield_fire = 0;
            }
            if(this.shield_poison < 0)
            {
                this.shield_poison *= 1 / (1 - this.defense_poison);
                this.shield_magic += this.shield_poison * (1 - this.defense_magic);
                this.shield_poison = 0;
            }
            if(this.shield_magic < 0)
            {
                this.shield_magic *= 1 / (1 - this.defense_magic);
                this.hp += this.shield_magic * (1 - this.defense_physical);
                this.shield_magic = 0;
            }
        }
    }
    add_poison(damage:number):void
    {
        this.buildup_poison += damage;
    }
    add_burn(damage:number):void
    {
        this.buildup_burn += damage;
    }
    add_bleed(damage:number):void
    {
        this.buildup_bleed += damage;
    }
    update_state(delta_time: number):void {
        if(this.hp > 0)
        {
            this.apply_poison(delta_time);
            this.apply_burn(delta_time);
            this.apply_bleed(delta_time);
        }
        this.set_direction_vector_to_face(this.current_target);
        if(this.distance(this.current_target) < 10)
        {
            if(this.current_target.parent)
            {
                this.current_target = this.current_target.parent;
            }
            else
            {
                this.game.lives -= this.attack * delta_time * 1/1000;
            }
        }
        super.update_state(delta_time); 
    }
    draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
        ctx.fillStyle = "#000000";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
};
export class Map {
    game:Game;
    paths:Path[];
    path_cell_map:DynamicInt32Array;
    last_updated:Path[];
    enemies:Enemy[];
    towers:Tower[];
    cell_dim:number;
    piece_type_instances:PathPiece[];
    projectiles:Projectile[];
    spatial_map:SpatialHashMap2D<Range<Tower>, Projectile, Enemy>;
    
    constructor(x:number, y:number, game:Game)
    {
        this.game = game;
        this.projectiles = [];
        this.enemies = [];
        this.towers = [];
        this.last_updated = [];
        this.cell_dim = game.cell_dim;
        this.paths = [new Path(x, y, game.cell_dim, game.cell_dim, this)];
        this.path_cell_map = new DynamicInt32Array(this.horizontal_cells() * this.vertical_cells())

        this.piece_type_instances = [];
        for(let i = 0; i < this.game.piece_types.length; i++)
        {
            const type = this.game.piece_types[i];
            this.piece_type_instances.push(new type(0, 0, 0, 0, null, null));
        }
    }

    add_projectile(projectile: Projectile):void {
        this.projectiles.push(projectile);
    }
    get_path_piece_parent_world_space(x:number, y:number):number[]
    {
        x = Math.floor(x / this.cell_dim);
        y = Math.floor(y / this.cell_dim);
        const wx = this.get_path_piece_parent(x, y) % this.horizontal_cells() * this.cell_dim;
        const wy = Math.floor(this.get_path_piece_parent(x, y) / this.horizontal_cells()) * this.cell_dim;
        return [wx + this.cell_dim * 0.5, wy + this.cell_dim * 0.5];
    }
    get_path_piece_parent(x:number, y:number):number
    {
        return this.path_cell_map[x + y * this.horizontal_cells()] >> 1;
    }
    set_path_piece_parent(parent_index:number, x:number, y:number):void
    {
        const current = x + y * this.horizontal_cells();
        this.path_cell_map[current] &= 1;
        this.path_cell_map[current] |= parent_index << 1;
    }
    set_piece_on_cell(x:number, y:number):void
    {
        const gx = Math.floor(x / this.cell_dim);
        const gy = Math.floor(y / this.cell_dim);
        const gindex = gx + gy * this.horizontal_cells();
        this.path_cell_map[gindex] |= this.piece_bit_mask();
    }
    clear_piece_on_cell(x:number, y:number):void
    {
        const gx = Math.floor(x / this.cell_dim);
        const gy = Math.floor(y / this.cell_dim);
        const gindex = gx + gy * this.horizontal_cells();
        this.path_cell_map[gindex] &= ~this.piece_bit_mask();
    }
    is_piece_on_cell(x:number, y:number):boolean
    {
        const gx = Math.floor(x / this.cell_dim);
        const gy = Math.floor(y / this.cell_dim);
        const gindex = gx + gy * this.horizontal_cells();
        return (this.path_cell_map[gindex] & this.piece_bit_mask()) === this.piece_bit_mask();
    }
    is_piece_here(x:number, y:number):boolean
    {
        const gindex = x + y * this.horizontal_cells();
        return (this.path_cell_map[gindex] & this.piece_bit_mask()) === this.piece_bit_mask();
    }
    piece_bit_mask():number
    {
        return 1;
    }
    horizontal_cells():number
    {
        return this.game.spatial_map_dim;
    }
    vertical_cells():number
    {
        return this.game.spatial_map_dim;
    }
    undo():void
    {
        if(this.last_updated.length > 0)
        {
            const path = this.last_updated.pop()!;
            path.undo_add();
        }
    }
    translate_to_cell_pos(pos:SquareAABBCollidable):void
    {
        pos.x -= pos.x % this.cell_dim;
        pos.y -= pos.y % this.cell_dim;
    }
    try_add_piece(x:number, y:number):boolean
    {
        let nearest_path = this.paths[0];
        const pos = new SquareAABBCollidable(x - this.cell_dim / 4, y - this.cell_dim / 4, this.cell_dim/2, this.cell_dim/2);
        let nearest_leaf = nearest_path.check_collision_slow(pos);
        //nearest_leaf = nearest_leaf && nearest_leaf.check_collision(pos)?nearest_leaf:null;
        console.log(nearest_leaf, x, y)
        for(let i = 1; i < this.paths.length; i++)
        {
            const path = this.paths[i];
            const leaf = nearest_path.check_collision_slow(pos);
            if(leaf && leaf.check_collision(pos))
            {
                nearest_path = path;
                nearest_leaf = leaf;
            }
        }
        if(nearest_leaf && nearest_path)
        {
            let piece:PathPiece|null = null;
            if(x < nearest_leaf.mid_x() && y >= nearest_leaf.y && nearest_leaf.y + nearest_leaf.height > y)//left
            {
                const types = this.game.piece_types.filter((piece, index, arr) => this.piece_type_instances[index].right_initially_free);
                piece = new types[Math.floor(random() * types.length)](nearest_leaf.x - this.cell_dim, nearest_leaf.y, nearest_leaf.width, nearest_leaf.height, nearest_path, nearest_leaf);
            }
            else if(x >= nearest_leaf.mid_x() && y >= nearest_leaf.y && nearest_leaf.y + nearest_leaf.height > y)//right
            {
                const types = this.game.piece_types.filter((piece, index, arr) => this.piece_type_instances[index].left_initially_free);
                piece = new types[Math.floor(random() * types.length)](nearest_leaf.x + this.cell_dim, nearest_leaf.y, nearest_leaf.width, nearest_leaf.height, nearest_path, nearest_leaf);
            }
            else if(y < nearest_leaf.mid_y() && x >= nearest_leaf.x && nearest_leaf.x + nearest_leaf.width > x)//top
            {
                const types = this.game.piece_types.filter((piece, index, arr) => this.piece_type_instances[index].bottom_initially_free);
                piece = new types[Math.floor(random() * types.length)](nearest_leaf.x, nearest_leaf.y - this.cell_dim, nearest_leaf.width, nearest_leaf.height, nearest_path, nearest_leaf);
            }
            else if(y >= nearest_leaf.mid_y() && x >= nearest_leaf.x && nearest_leaf.x + nearest_leaf.width > x)//bottom
            {
                const types = this.game.piece_types.filter((piece, index, arr) => this.piece_type_instances[index].top_initially_free);
                piece = new types[Math.floor(random() * types.length)](nearest_leaf.x, nearest_leaf.y + this.cell_dim, nearest_leaf.width, nearest_leaf.height, nearest_path, nearest_leaf);
            }
            if(piece)
                console.log("passes check collision fast:",!this.check_collision_fast(piece!), console.log(piece))
            if(piece && !this.check_collision_fast(piece))
            {
                this.last_updated.push(nearest_path);
                nearest_leaf.try_insert_child(x, y, piece);
                return true;
            }
        }
        return false;
    }
    pick_random_path():Path
    {
        return this.paths[Math.floor(random() * this.paths.length)];
    }
    add_random_enemy():void
    {
        const type_index = Math.floor(random() * this.game.enemy_types.length);
        const path = this.pick_random_path();
        const leaf = path.pick_random_leaf()!;
        if(leaf)
        {
            const enemy = new this.game.enemy_types[type_index]!(leaf.mid_x(), leaf.mid_y() - leaf.width / 2, leaf.width / 2, leaf.width / 2, leaf);
            this.enemies.push(enemy);
        }
    }
    check_collision_fast(collidable:SquareAABBCollidable):boolean
    {
        return this.is_piece_on_cell(collidable.x, collidable.y) || this.towers_present(collidable.x, collidable.y) > 0;
    }
    towers_present(x:number, y:number):number
    {
        const map_x = Math.floor(x / this.cell_dim);
        const map_y = Math.floor(y / this.cell_dim);
        return (this.path_cell_map[map_x + map_y * this.horizontal_cells()] & (1 << 5) - 1) >> 1;
    }
    inc_towers_present(x:number, y:number):void
    {
        const map_x = Math.floor(x / this.cell_dim);
        const map_y = Math.floor(y / this.cell_dim);
        const towers_present = this.towers_present(x, y);
        this.path_cell_map[map_x + map_y * this.horizontal_cells()] &= ~(((1 << 4) - 1) << 1);
        this.path_cell_map[map_x + map_y * this.horizontal_cells()] |= (towers_present + 1) << 1;
    }
    try_place_tower(tower:Tower):boolean
    {
        if(!this.is_piece_here(tower.x, tower.y) && this.towers_present(tower.x, tower.y) < 4)
        {
            this.towers.push(tower);
            this.inc_towers_present(tower.x, tower.y);
            return true;
        }
        return false;
    }
    update_state(delta_time: number):void {
        this.projectiles.forEach(projectile => projectile.update_state(delta_time));
        const to_be_detonated = this.projectiles.filter(projectile => projectile.is_at_target());
        this.projectiles = this.projectiles.filter(projectile => !projectile.is_at_target());
        this.spatial_map = new SpatialHashMap2D<Range<Tower>, Projectile, Enemy>(
            [], to_be_detonated, this.enemies, this.game.max_x, this.game.max_y, this.game.spatial_map_dim, this.game.spatial_map_dim);
        this.spatial_map.handle_by_cell(() => {}, () => {}, () => {}, 
            (projectile:Projectile, enemy:Enemy) => {
                //TODO use spatial map to detonate the to be detonated projectiles 
                //here
                enemy.take_damage(projectile);

            });
        //we don't want to actually perform collision on towers so we leave it empty for handle
        //by cell, but we do want their ranges spatially mapped so we can check when one is
        //in range of a place
        this.towers.forEach(tower => {this.spatial_map.push_collidable(tower.range); tower.clear_targets();});
        this.enemies = this.enemies.filter(enemy => enemy.hp > 0);
        const queue = new Queue<PathPiece>();
        const checked = new DynamicInt32Array(this.horizontal_cells() * this.vertical_cells());
        checked.fill(0);
        this.paths.forEach(path => queue.push(path.root));
        while(queue.length > 0)
        {
            const piece = queue.pop();
            //if this is the first piece in a tower's range with enemies on it
            //this is nearest
            //then we need to find the piece with the max enemies attributes like shield and health
            
            const map_x = Math.floor(piece.x / this.cell_dim + 0.1);
            const map_y = Math.floor(piece.y / this.cell_dim + 0.1);
            const objects_cell = this.spatial_map.get_cell(map_x, map_y);
            const tower_ranges:Range<Tower>[] = objects_cell.collidable_objects;
            const enemies:Enemy[] = objects_cell.collidable_not_with_self2;
            let highest_hp = 0;
            let highest_shield_fire = 0;
            let highest_shield_magic = 0;
            let highest_shield_poison = 0;
            let highest_shield_physical = 0;
            //calc max properties for this cell of enemies present
            enemies.forEach(enemy => {
                if(enemy.hp > highest_hp)
                    highest_hp = enemy.hp;
                if(enemy.shield_fire > highest_shield_fire)
                    highest_shield_fire = enemy.shield_fire;
                if(enemy.shield_magic > highest_shield_magic)
                    highest_shield_magic = enemy.shield_magic;
                if(enemy.shield_physical > highest_shield_physical)
                    highest_shield_physical = enemy.shield_physical;
                if(enemy.shield_poison > highest_shield_poison)
                    highest_shield_poison = enemy.shield_poison;
            });
            if(enemies.length > 0)
            tower_ranges.forEach(tower_range => {
                const tower = tower_range.range_for;
                if(tower.closest === null)
                {
                    tower.closest = new Target(piece.x, piece.y, piece.width, 0);
                }
                if(!tower.highest_hp || tower.highest_hp.value < highest_hp)
                {
                    if(!tower.highest_hp)
                        tower.highest_hp = new Target(piece.x, piece.y, piece.width, 0);
                    tower.highest_hp.value = highest_hp;
                }
                if(!tower.highest_shield_fire || tower.highest_shield_fire.value < highest_shield_fire)
                {
                    if(!tower.highest_shield_fire)
                        tower.highest_shield_fire = new Target(piece.x, piece.y, piece.width, 0);
                    tower.highest_shield_fire.value = highest_shield_fire;
                }
                if(!tower.highest_shield_magic || tower.highest_shield_magic.value < highest_shield_magic)
                {
                    if(!tower.highest_shield_magic)
                        tower.highest_shield_magic = new Target(piece.x, piece.y, piece.width, 0);
                    tower.highest_shield_magic.value = highest_shield_magic;
                }

                if(!tower.highest_shield_poison || tower.highest_shield_poison.value < highest_shield_poison)
                {
                    if(!tower.highest_shield_poison)
                        tower.highest_shield_poison = new Target(piece.x, piece.y, piece.width, 0);
                    tower.highest_shield_poison.value = highest_shield_poison;
                }
                if(!tower.highest_shield_physical || tower.highest_shield_physical.value < highest_shield_physical)
                {
                    if(!tower.highest_shield_physical)
                        tower.highest_shield_physical = new Target(piece.x, piece.y, piece.width, 0);
                    tower.highest_shield_physical.value = highest_shield_physical;
                }
            })
            //add 0.1 to correct for floating point error since it should divide to a whole number
            //since piece.x and piece.y are multiples of this.cell_dim
            //if there were no error even adding 0.9 shouldn't change results
            //but because there is i am concerned it may end up at 0.999... or something
            //like that, and adding the 0.1 should correct this 
            if(!checked[map_x + map_y * this.horizontal_cells()])
            {
                checked[map_x + map_y * this.horizontal_cells()] |= 1;
                if(piece.children.left_child && !piece.left_free())
                {
                    queue.push(piece.children.left_child!);
                }
                if(piece.children.right_child && !piece.right_free())
                {
                    queue.push(piece.children.right_child!);
                }
                if(piece.children.top_child && !piece.top_free())
                {
                    queue.push(piece.children.top_child!);
                }
                if(piece.children.bottom_child && !piece.bottom_free())
                {
                    queue.push(piece.children.bottom_child!);
                }
            }
        }
        this.enemies.forEach(enemy => enemy.update_state(delta_time));
        this.towers.forEach(tower => {tower.update_state(delta_time);});
    }
    draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
        this.paths.forEach(path => path.draw(canvas, ctx, x, y, width, height));
        this.enemies.forEach(enemy => enemy.draw(canvas, ctx, x, y, width, height));
        this.towers.forEach(tower => tower.draw(canvas, ctx, x, y, width, height));
        this.projectiles.forEach(projectile => projectile.draw(canvas, ctx, x, y, width, height));
    }
};