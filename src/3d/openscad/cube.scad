$fn = 100;

// printed part
// diffusor / mounted on led panel
$height_mm = 5;
$outer_wall_space_mm = 1;
$diffusor_width_mm = 0.8;
$wall_width_mm = 2;
$nudge_center_from_outside_mm = 4.5;
$nudge_depth_mm = 3.5;
$nudge_width_mm = 5;
$nudge_height_mm = 3;
// cube / frame / diffusor mount
$mount_surface_mm = 3;
$mount_offset_mm = 2;
$tolerance_mm = 0.5;
$panel_space_mm = 5;
$edge_cut_mm = 3;
$corner_cut_mm = 6.5;

//// 8x8
$num_leds_x = 8;
$led_dist_x = 65/8;
// 16x16
//$num_leds_x = 16;
//$num_leds_y = 16;
//$led_dist_x = 10;
//$led_dist_y = 10;

// because cube
$num_leds_y = $num_leds_x;
$led_dist_y = $led_dist_x;

// main
$wall_height_mm = $height_mm - $outer_wall_space_mm;
$outer_x = ($num_leds_x) * $led_dist_x;
$outer_y = ($num_leds_y) * $led_dist_y;

$small= $outer_x + ($tolerance_mm) * 2;
$big = $small + ($height_mm + $panel_space_mm) * 2;

$corner_sphere_radius = sqrt(3 * pow($big/2, 2))-$corner_cut_mm;
$edge_cylinder_radius = sqrt(2 * pow($big/2, 2))-$edge_cut_mm;

// easier to print with this rotation
rotate([90,0,0])
difference() {
    union() {
        panelFrameCube();
        mountSurfaces();
    }
    nudges();
}

module nudges() {
    nudge([0,0,0]);
    nudge([0,90,0]);
    nudge([0,180,0]);
    nudge([0,270,0]);

    nudge([0,0,90]);
    nudge([0,180,90]);
}

module nudge(r) {
    rotate(r) {
        translate([$big/2 - $nudge_center_from_outside_mm, 0, 0]) {
            cube([$nudge_height_mm,$small
            + $nudge_depth_mm
            ,$nudge_width_mm], center=true);
        }
    }
}

module panelFrameCube() {
    edgeCut() {
        difference() {
            cube([$big,$big,$big], center=true);
            union() {
                cube([$big + 1, 
                    $small, 
                    $small], center=true);
                cube([$small, 
                    $big + 1, 
                    $small], center=true);
                cube([$small, 
                    $small, 
                    $big + 1], center=true);
            }
        }
    }
}

module mountSurfaces() {
    mountSurface([0,0,0]);
    mountSurface([0,90,0]);
    mountSurface([0,180,0]);
    mountSurface([0,270,0]);

    mountSurface([0,0,90]);
    mountSurface([0,180,90]);
}

module mountSurface(r) {
    rotate(r)
    translate([($small+$mount_offset_mm)/2,0,0])
    difference() {
        cube([$mount_offset_mm,$small-0.001,$small-0.001], center=true);
        cube([$mount_offset_mm*2,$small,$small-(2*$mount_surface_mm)], center=true);
    }
}

module edgeCut() {
    edgeCutCylinder([0,90,0]) 
        edgeCutCylinder([90,0,0]) 
            edgeCutCylinder([0,0,0])
                intersection() {
                    sphere(r = $corner_sphere_radius);
                    children();
                }
}


module edgeCutCylinder(ro) {
    intersection() {
        rotate(ro){
            cylinder(h=$big*2, r=$edge_cylinder_radius, center=true);
        }
        children();
    }
}
