//
// Microsoft Xbox 360 controller HID mapping
// Copyright (C) 2013 Delta Kurshiva
// For Mixxx version 1.11.x
//

function Xbox360Controller() {
    this.controller = new HIDController();
    this.controller.activeDeck = 1;

    this.registerInputPackets = function() {
        packet = new HIDPacket("control", [0x0, 0x14], 14);

        // Toggle buttons.
        packet.addControl("hid", "left_bumper", 2, "B", 0x01);
        packet.addControl("hid", "right_bumper", 2, "B", 0x02);
        packet.addControl("hid", "guide", 2, "B", 0x04);
        packet.addControl("hid", "a_button", 2, "B", 0x10);
        packet.addControl("hid", "b_button", 2, "B", 0x20);
        packet.addControl("hid", "x_button", 2, "B", 0x40);
        packet.addControl("hid", "y_button", 2, "B", 0x80);
        packet.addControl("hid", "dpad_up", 3, "B",  0x01);
        packet.addControl("hid", "dpad_down", 3, "B", 0x02);
        packet.addControl("hid", "dpad_left", 3, "B", 0x04);
        packet.addControl("hid", "dpad_right", 3, "B", 0x08);
        packet.addControl("hid", "start", 3, "B", 0x10);
        packet.addControl("hid", "back", 3, "B", 0x20);
        packet.addControl("hid", "left_stick_click", 3, "B", 0x40);
        packet.addControl("hid", "right_stick_click", 3, "B", 0x80);

        // 0x0 left, 0xff right
        packet.addControl("hid","left_stick_x",0x6,"B");
        packet.setMinDelta("hid","left_stick_x",2);
        packet.addControl("hid","right_stick_x",0x8,"B");
        packet.setMinDelta("hid","right_stick_x",2);

        // 0x0 top, 0xff bottom
        packet.addControl("hid","left_stick_y",0x7,"B");
        packet.setMinDelta("hid","left_stick_y",2);
        packet.addControl("hid","right_stick_y",0x9,"B");
        packet.setMinDelta("hid","right_stick_y",2);

        // Toggle button pressure sensitivity 0x00-0xff
        packet.addControl("hid","left_trigger",0x12,"B");
        packet.setMinDelta("hid","left_trigger",4);
        packet.addControl("hid","right_trigger",0x13,"B");
        packet.setMinDelta("hid","right_trigger",4);

        this.controller.registerInputPacket(packet);
    }

    // Sixxaxis has no output controls
    this.registerOutputPackets = function() { }

    // No default scalers: all controls done with callbacks anyway
    this.registerScalers = function() { }

    // Register your own callbacks in caller by overriding this
    this.registerCallbacks = function() { }

}

// SonySixxAxisController is defined in SonySixxAxis.hid.js
Xbox360 = new Xbox360Controller();

// Mandatory function for mixxx controllers
Xbox360.init = function(id) {
    Xbox360.id = id;
    var controller = Xbox360.controller;
    Xbox360.registerInputPackets();
    Xbox360.registerCallbacks();

    controller.startAutoRepeatTimer = function(timer_id,interval) {
        if (controller.timers[timer_id])
            return;
        controller.timers[timer_id] = engine.beginTimer(
            interval,
            "Xbox360.controller.autorepeatTimer()"
        )
    }
    HIDDebug("Xbox 360 controller initialized: " + Xbox360.id);
}

// Mandatory function for mixxx controllers
Xbox360.shutdown = function() {
    Xbox360.controller.close();
    HIDDebug("Xbox 360 controller shutdown: " + Xbox360.id);
}

// Mandatory function to receive anything from HID
Xbox360.incomingData = function(data,length) {
    Xbox360.controller.parsePacket(data,length);
}

// Register callbacks for "hid" controls defined in Xbox360Controller
Xbox360.registerCallbacks = function(id) {
    var controller = Xbox360.controller;
    var packet = Xbox360.controller.getInputPacket("control");
    if (packet==undefined) {
        HIDDebug("No input packet " +control+ " defined");
        return;
    }
    if (controller==undefined) {
        HIDDebug("Error registrering callbacks: controller is undefined");
        return;
    }

    // Link HID buttons to UI buttons
    controller.linkControl("hid","left_bumper","deck1","play");
    controller.linkControl("hid","right_bumper","deck2","play");
    controller.linkControl("hid","guide","[Microphone]","talkover");
    controller.linkControl("hid","a_button","deck2","keylock");
    controller.linkControl("hid","b_button","deck2","flanger");
    controller.linkControl("hid","x_button","deck2","beatsync");
    controller.linkControl("hid","y_button","deck2","cue_default");
    controller.linkControl("hid","dpad_up","deck1","cue_default");
    controller.linkControl("hid","dpad_down","deck1","keylock");
    controller.linkControl("hid","dpad_left","deck1","beatsync");
    controller.linkControl("hid","dpad_right","deck1","flanger");
    controller.linkControl("hid","start","deck2","reloop_exit");
    controller.linkControl("hid","back","deck1","reloop_exit");
    controller.linkControl("hid","left_stick_click","deck1","eject");
    controller.linkControl("hid","right_stick_click","deck2","eject");

    // Callbacks for toggle buttons front of controller
    controller.setCallback("control","hid","button_bottom_left",Xbox360.front_left);
    controller.setCallback("control","hid","button_top_left",Xbox360.front_left);
    controller.setCallback("control","hid","button_bottom_right",Xbox360.front_right);
    controller.setCallback("control","hid","button_top_right",Xbox360.front_right);

    // Callbacks for pressure sensitive buttons front of controller
    controller.setCallback("control","hid","pressure_bottom_left",Xbox360.left_bend);
    controller.setCallback("control","hid","pressure_top_left",Xbox360.left_bend);
    controller.setCallback("control","hid","pressure_bottom_right",Xbox360.right_bend);
    controller.setCallback("control","hid","pressure_top_right",Xbox360.right_bend);

    // Callbacks for jog controls
    controller.setCallback("control","hid","jog_left_y",Xbox360.left_jog);
    controller.setCallback("control","hid","jog_right_y",Xbox360.right_jog);

    controller.setCallback("control","hid","jog_left_x",Xbox360.left_jog);
    controller.setCallback("control","hid","jog_right_x",Xbox360.right_jog);

};

Xbox360.front_left = function(field) {
    var controller = Xbox360.controller;
    if (field.value==controller.buttonStates.released)
        return;
    if (!controller.modifiers.get("shift_left"))
        return;
    if (field.name=="button_top_left") 
        engine.setValue("[Playlist]","SelectPrevPlaylist",true);
    if (field.name=="button_bottom_left") 
        engine.setValue("[Playlist]","SelectNextPlaylist",true);
}

Xbox360.front_right = function(field) {
    var controller = Xbox360.controller;
    if (field.value==controller.buttonStates.released)
        return;
    if (!controller.modifiers.get("shift_right")) 
        return;
    if (field.name=="button_top_right") {
        engine.setValue("[Playlist]","SelectPrevTrack",true);
        var callback = function(field) {
            engine.setValue("[Playlist]","SelectPrevTrack",true);
        }
        controller.setAutoRepeat("hid","button_top_right",callback,150);
    }
    if (field.name=="button_bottom_right") {
        engine.setValue("[Playlist]","SelectNextTrack",true);
        var callback = function(field) {
            engine.setValue("[Playlist]","SelectNextTrack",true);
        }
        controller.setAutoRepeat("hid","button_bottom_right",callback,150);
    }
}

Xbox360.left_jog = function(field) {
    var controller = Xbox360.controller;
    var group = controller.resolveGroup("deck1");
    if (group==undefined)
        return;
    if (field.name=="jog_left_y") {
        if (field.delta<=0) 
            return;
        old_value = engine.getValue(group,"rate");
        if (field.value<115)
            engine.setValue(group,"rate",old_value+0.005);
        else if (field.value>135)
            engine.setValue(group,"rate",old_value-0.005);
    }
    if (field.name=="jog_left_x") {

    }
}

Xbox360.right_jog = function(field) {
    var controller = Xbox360.controller;
    var group = controller.resolveGroup("deck2");
    var old_value = undefined;
    if (group==undefined)
        return;
    if (field.name=="jog_right_y") {
        if (field.delta<=0) 
            return;
        old_value = engine.getValue(group,"rate");
        if (field.value<115)
            engine.setValue(group,"rate",old_value+0.005);
        else if (field.value>135)
            engine.setValue(group,"rate",old_value-0.005);
    }
    if (field.name=="jog_right_x") {

    }
}

Xbox360.left_bend = function(field) {
    var controller = Xbox360.controller;
    if (controller.modifiers.get("shift_left")) 
        return;
    if (field.name=="pressure_top_left") {
        Xbox360.jog_bend("deck1","down",field.value);
        var callback = function(field) {
            Xbox360.jog_bend("deck1","down",64);
        }
        controller.setAutoRepeat("hid","pressure_top_left",callback,50);
    }
    if (field.name=="pressure_bottom_left") {
        Xbox360.jog_bend("deck1","up",field.value);
        var callback = function() {
            Xbox360.jog_bend("deck1","up",64);
        }
        controller.setAutoRepeat("hid","pressure_bottom_left",callback,50);
    }
}

Xbox360.right_bend = function(field) {
    var controller = Xbox360.controller;
    if (controller.modifiers.get("shift_right")) 
        return;
    if (field.name=="pressure_top_right") {
        Xbox360.jog_bend("deck2","down",field);
        var callback = function() {
            Xbox360.jog_bend("deck2","down",64);
        }
        controller.setAutoRepeat("hid","pressure_top_right",callback,50);
    }
    if (field.name=="pressure_bottom_right") {
        Xbox360.jog_bend("deck2","up",field);
        var callback = function() {
            Xbox360.jog_bend("deck2","up",64);
        }
        controller.setAutoRepeat("hid","pressure_bottom_right",callback,50);
    }
}

Xbox360.jog_bend = function(group,direction,value) {
    var controller = Xbox360.controller;
    var jog_value = value/32;
    group = controller.resolveGroup(group);
    if (group==undefined)
        return;
    if (direction=="up")
        engine.setValue(group,"jog",6);
    if (direction=="down")
        engine.setValue(group,"jog",-6);
}


