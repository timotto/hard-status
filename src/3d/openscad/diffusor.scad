$fn = 100;

type = "diffusor";
//type = "wallpanel";

// printed part
// diffusor / mounted on led panel
$height_mm = 5;
$outer_wall_space_mm = 1;
$diffusor_width_mm = 0.8;
$wall_width_mm = 2;
// type == "diffusor"
$nudge_center_from_outside_mm = 4;
$nudge_depth_mm = 3.5;
$nudge_width_mm = 6;
$nudge_height_mm = 3;
// type == "wallpanel"
$nail_hole_diameter_mm = 5;
$nail_hole_strength_mm = 3;
$nail_hole_height_mm = 2;

// cube / frame / diffusor mount
$mount_surface_mm = 3;
$mount_offset_mm = 2;
$tolerance_mm = 0.5;
$panel_space_mm = 5;
$edge_cut_mm = 3;
$corner_cut_mm = 6.5;
$inner_nudge_depth_mm = 1;
$inner_nudge_width_mm = 4;
$inner_nudge_height_mm = 2;

//// 8x8
$num_leds_x = 8;
$num_leds_y = 8;
$led_dist_x = 65/8;
$led_dist_y = 65/8;
// 16x16
//$num_leds_x = 16;
//$num_leds_y = 16;
//$led_dist_x = 10;
//$led_dist_y = 10;

// main
$wall_height_mm = $height_mm - $outer_wall_space_mm;
$outer_x = ($num_leds_x) * $led_dist_x;
$outer_y = ($num_leds_y) * $led_dist_y;

$small= $outer_x + ($tolerance_mm) * 2;
$big = $small + ($height_mm + $panel_space_mm) * 2;

cap();
if (type == "diffusor") {
    // add nudges so it snaps in to the cube
    nudges();
} else if (type == "wallpanel") {
    // add ring to hand it on a nail in the wall
    nailrings();
}

module nailrings() {
    nailring();
    rotate([0,0,180]) translate([-$outer_x,-$outer_y,0]) nailring();
}

module nailring() {
    outer_size = $nail_hole_diameter_mm + $nail_hole_strength_mm;
    
    translate([$outer_x/2, 0, $height_mm - $nail_hole_height_mm]) {
        difference() {
            difference() {
                cylinder(d=outer_size, h=$nail_hole_height_mm);
                translate([0,0,-1])
                cylinder(d=($nail_hole_diameter_mm), h=$nail_hole_height_mm + 2);
            }
            translate([-outer_size/2,0.001,-1])
            cube([outer_size,outer_size/2,$nail_hole_height_mm+2]);
        }
    }
}

module prism(l, w, h){
    translate([-l/2,-w/2,-h/2])
    polyhedron(
        points=[
            [0,0,0], [l,0,0], [l,w,0], [0,w,0], [0,w,h], [l,w,h]],
        faces=[[0,1,2,3],[5,4,3,2],[0,4,5,1],[0,3,4],[5,2,1]]
    );
}

module nudge(r) {
    translate([$outer_x/2,$outer_y/2,$nudge_center_from_outside_mm])
    rotate([0,0,r])
    translate([0,-$outer_x/2-$inner_nudge_depth_mm/2,0]) {
        difference() {
        prism($inner_nudge_width_mm,$inner_nudge_depth_mm,$inner_nudge_height_mm);
        translate([0,0,$height_mm - $nudge_center_from_outside_mm + 3 - 0.01])
        cube([6,6,6],center=true);
        }
    }
}
module nudges() {
    nudge(0);
    nudge(180);
}

module cap() {
    union() {
        // <outer walls>
        cube([$outer_x, $wall_width_mm/2, $height_mm]);
        cube([$wall_width_mm/2, $outer_y, $height_mm]);
        translate([$outer_x, $outer_y]){
            rotate([0,0,180]) {
                cube([$outer_x, $wall_width_mm/2, $height_mm]);
                cube([$wall_width_mm/2, $outer_y, $height_mm]);
            }
        }
        // </outer walls>

        // <inner walls>
        for($x = [1 : $num_leds_x-1]) {
            $offset_x = $x * $led_dist_x;
            
            translate([$offset_x - ($wall_width_mm/2), 0, 0]) {
                cube([$wall_width_mm, $outer_y, $wall_height_mm]);
            }
        }
        for($y = [1 : $num_leds_y - 1]) {
            $offset_y = $y * $led_dist_y;
            
            translate([0, $offset_y - ($wall_width_mm/2), 0]) {
                cube([$outer_x, $wall_width_mm, $wall_height_mm]);
            }
        }
        // </inner walls>

        // <diffusor>
        translate([0,0,-$diffusor_width_mm]) {
            cube([$outer_x, $outer_y, $diffusor_width_mm]);
        }
        // </diffusor>
    }
}