//
// Microsoft Xbox 360 controller HID mapping
// Copyright (C) 2013 Delta Kurshiva, Shiz
// For Mixxx version 1.11.x
//

function Xbox360Controller() {
    this.controller = new HIDController();
    this.controller.config = {};
    var conf = this.controller.config;
    
    conf.xfade_speed = 1; // Speed multiplier of the trigger crossfades
    conf.xfade_refresh = 50; // trigger crossfade timer refresh in milliseconds
    conf.vol_mode_indicator = 'rotate'; // what led mode to use when it's not in xfade mode
    conf.fast_shuttle_speed = 16; // maximum fast shuttle speed
    conf.slow_shuttle_speed = 1; // maximum slow shuttle speed
    conf.stick_safety = 5000; // stick safety zone size
    conf.xfade_throw_threshold = 120; // minimum delta needed to throw the xfader to one side, set to 255+ to effectively disable

    this.controller.activeDeck = 1;
    this.controller.toggleButtons.push("flanger");
    //this.controller.toggleButtons.push("talkover");
    
    this.registerInputPackets = function() {
        packet = new HIDPacket("control", [0x0, 0x14], 14);

        // Toggle buttons.
        packet.addControl("hid", "left_bumper", 3, "B", 0x01);
        packet.addControl("hid", "right_bumper", 3, "B", 0x02);
        packet.addControl("hid", "guide", 3, "B", 0x04);
        packet.addControl("hid", "a_button", 3, "B", 0x10);
        packet.addControl("hid", "b_button", 3, "B", 0x20);
        packet.addControl("hid", "x_button", 3, "B", 0x40);
        packet.addControl("hid", "y_button", 3, "B", 0x80);
        packet.addControl("hid", "dpad_up", 2, "B",  0x01);
        packet.addControl("hid", "dpad_down", 2, "B", 0x02);
        packet.addControl("hid", "dpad_left", 2, "B", 0x04);
        packet.addControl("hid", "dpad_right", 2, "B", 0x08);
        packet.addControl("hid", "start", 2, "B", 0x10);
        packet.addControl("hid", "back", 2, "B", 0x20);
        packet.addControl("hid", "left_stick_click", 2, "B", 0x40);
        packet.addControl("hid", "right_stick_click", 2, "B", 0x80);

        // Toggle trigger sensitivity
        packet.addControl("hid","left_trigger",4,"B");
        packet.addControl("hid","right_trigger",5,"B");

        // sticks
        packet.addControl("hid","left_stick_x",0x6,"h");
        packet.setMinDelta("hid","left_stick_x",2);
        packet.addControl("hid","left_stick_y",0x8,"h");
        packet.setMinDelta("hid","left_stick_y",2);
        
        packet.addControl("hid","right_stick_x",0xA,"h");
        packet.setMinDelta("hid","right_stick_x",2);
        packet.addControl("hid","right_stick_y",0xC,"h");
        packet.setMinDelta("hid","right_stick_y",2);

        this.controller.registerInputPacket(packet);
    }
    
    this.controller.LEDStates = { off: 0x0,
                                  blink_all: 0x01, 
                                  flash_on_1: 0x02,
                                  flash_on_2: 0x03,
                                  flash_on_3: 0x04,
                                  flash_on_4: 0x05,
                                  on_1: 0x06,
                                  on_2: 0x07,
                                  on_3: 0x08,
                                  on_4: 0x09,
                                  rotate: 0x0a,
                                  blink_prev: 0x0b,
                                  slow_blink_prev: 0x0c,
                                  alternate: 0x0d };

    this.registerOutputPackets = function() {
        packet = new HIDPacket('controller_led',[0x01,0x03],3);    
        packet.addOutput("hid","led_ring",2,"B");
        this.controller.registerOutputPacket(packet);
    }

    // No default scalers: all controls done with callbacks anyway
    this.registerScalers = function() { }

    // Register your own callbacks in caller by overriding this
    this.registerCallbacks = function() { }

}

Xbox360 = new Xbox360Controller();

// Mandatory function for mixxx controllers
Xbox360.init = function(id) {
    Xbox360.id = id;
    var controller = Xbox360.controller;
    Xbox360.registerInputPackets();
    Xbox360.registerCallbacks();
    Xbox360.registerOutputPackets();
    Xbox360.startXfadeTimer();

    controller.xfade_triggers = true;
    controller.xfade_delta_left = 0;
    controller.xfade_delta_right = 0;
    controller.guide_is_pressed = false;
    controller.left_stick_y_locked = false;
    controller.right_stick_y_locked = false;
    

    controller.startAutoRepeatTimer = function(timer_id,interval) {
        if (controller.timers[timer_id])
            return;
        controller.timers[timer_id] = engine.beginTimer(
            interval,
            "Xbox360.controller.autorepeatTimer()"
        )
    }
    engine.connectControl("[Master]", "crossfader", "Xbox360.resolveXfade");    
    HIDDebug("Xbox 360 controller initialized: " + Xbox360.id);
}

// Mandatory function for mixxx controllers
Xbox360.shutdown = function() {
    var controller = Xbox360.controller;
    engine.connectControl("[Master]", "crossfader", "Xbox360.resolveXfade", true);
    controller.close();
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
        HIDDebug("Error registering callbacks: controller is undefined");
        return;
    }

    // Link HID buttons to UI buttons
    controller.linkControl("hid","left_bumper","deck1","play");
    controller.linkControl("hid","right_bumper","deck2","play");    
    controller.linkControl("hid","a_button","deck2","keylock");
    controller.linkControl("hid","b_button","deck2","flanger");
    controller.linkControl("hid","x_button","deck2","beatsync");
    controller.linkControl("hid","y_button","deck2","cue_default");
    controller.linkControl("hid","dpad_up","deck1","cue_default");
    controller.linkControl("hid","dpad_down","deck1","keylock");
    controller.linkControl("hid","dpad_left","deck1","beatsync");
    controller.linkControl("hid","dpad_right","deck1","flanger");
    //controller.linkControl("hid","start","deck2","reloop_exit");
    //controller.linkControl("hid","back","deck1","reloop_exit");
    controller.linkControl("hid","left_stick_click","deck1","eject");
    controller.linkControl("hid","right_stick_click","deck2","eject");

    // buttons that need to call functions
    controller.setCallback("control","hid","guide",Xbox360.centerXfade);
    controller.setCallback("control","hid","start",Xbox360.setTriggerXfade);
    controller.setCallback("control","hid","back",Xbox360.setTriggerChannel);

    // Callbacks for triggers
    controller.setCallback("control","hid","left_trigger",Xbox360.leftTrigger);
    controller.setCallback("control","hid","right_trigger",Xbox360.rightTrigger);

    // Callbacks for sticks
    controller.setCallback("control","hid","left_stick_x",Xbox360.leftShuttleSlow);
    controller.setCallback("control","hid","left_stick_y",Xbox360.leftShuttleFast);
    controller.setCallback("control","hid","right_stick_x",Xbox360.rightShuttleSlow);
    controller.setCallback("control","hid","right_stick_y",Xbox360.rightShuttleFast);

}

// resolve triggers

Xbox360.leftTrigger = function(field) {
    var ctrl = Xbox360.controller;
    if (ctrl.xfade_triggers) {
        if (field.delta > ctrl.config.xfade_throw_threshold) {
            engine.setValue("[Master]", "crossfader", -1);
        }
        ctrl.xfade_delta_left = -1 * field.value;
    } else {
        Xbox360.channelVolume("deck1", field);
    }
}

Xbox360.rightTrigger = function(field) {
    var ctrl = Xbox360.controller;
    if (ctrl.xfade_triggers) {
        if (field.delta > ctrl.config.xfade_throw_threshold) {
            engine.setValue("[Master]", "crossfader", 1);
        }
        ctrl.xfade_delta_right = field.value;
    } else {
        Xbox360.channelVolume("deck2", field);
    }
}

Xbox360.channelVolume = function(group, field) {
    var controller = Xbox360.controller;
    engine_group = controller.resolveGroup(group);
    if (engine_group==undefined)
        return;
    engine.setValue(engine_group,"volume",1.0 - (field.value / 255));
}

// resolve stick x-axis

Xbox360.leftShuttleSlow = function(field) {
    var controller = Xbox360.controller;
    if (field.value > controller.config.stick_safety || field.value < (-1 * controller.config.stick_safety)) {
        controller.left_stick_y_locked = true;
    } else {
        controller.left_stick_y_locked = false;
    }
    Xbox360.shuttle("deck1", field, controller.config.slow_shuttle_speed);
}

Xbox360.rightShuttleSlow = function(field) {
    var controller = Xbox360.controller;
    if (field.value > controller.config.stick_safety || field.value < (-1 * controller.config.stick_safety)) {
        controller.right_stick_y_locked = true;
    } else {
        controller.right_stick_y_locked = false;
    }
    Xbox360.shuttle("deck2", field, controller.config.slow_shuttle_speed);
}

// resolve stick y-axis

Xbox360.leftShuttleFast = function(field) {
    var controller = Xbox360.controller;
    if (!controller.left_stick_y_locked) {
        Xbox360.shuttle("deck1", field, -1 * controller.config.fast_shuttle_speed);
    }
}

Xbox360.rightShuttleFast = function(field) {
    var controller = Xbox360.controller;
    if (!controller.right_stick_y_locked) {
        Xbox360.shuttle("deck2", field, -1 * controller.config.fast_shuttle_speed);
    }
}

// shared shuttle code

Xbox360.shuttle = function(group, field, factor) {
    var controller = Xbox360.controller;
    engine_group = controller.resolveGroup(group);
    if (engine_group==undefined)
        return;
    engine.setValue(engine_group,"scratch", (field.value / 32767) * factor);
}

// generic LED handler

Xbox360.changeLED = function(code) {
    var controller = Xbox360.controller;
    var packet = controller.OutputPackets['controller_led'];
    var field = packet.getField('hid', 'led_ring');
    field.value = code;
    packet.send();
}

// actual LED mapper

Xbox360.resolveXfade = function(value, group, control) {
    var led = Xbox360.controller.LEDStates;
    if (!Xbox360.controller.xfade_triggers) {
        return;
    }
    if (value == 0) {
        Xbox360.changeLED(led['off']);
    } else if (value >= 1) {
        Xbox360.changeLED(led['on_2']);
    } else if (value <= -1) {
        Xbox360.changeLED(led['on_1']);
    } else if (value > 0) {
        Xbox360.changeLED(led['on_4']);
    } else {
        Xbox360.changeLED(led['on_3']);
    }
}

// Trigger crossfade mode

Xbox360.toggleTriggerMode = function(field) {
    var controller = Xbox360.controller;
    if (controller.guide_is_pressed) {
       controller.guide_is_pressed  = false;
       return;
    }
    controller.guide_is_pressed = true;
    if (controller.xfade_triggers) {
        Xbox360.setTriggerChannel(field);
    } else {
        Xbox360.setTriggerXfade(field);
    }
}

Xbox360.setTriggerXfade = function(field) {
    var controller = Xbox360.controller;
    controller.xfade_triggers = true;
    Xbox360.resolveXfade(engine.getValue("[Master]","crossfader"),0,0);
    engine.stopTimer(controller.xfade_timer);
    Xbox360.startXfadeTimer();
    HIDDebug("Trigger crossfade mode is now on.");
}

Xbox360.setTriggerChannel = function(field) {
    var controller = Xbox360.controller;
    controller.xfade_triggers = false;
    Xbox360.changeLED(controller.LEDStates[controller.config.vol_mode_indicator]);
    engine.stopTimer(controller.xfade_timer);
    HIDDebug("Trigger crossfade mode is now off.");
}

Xbox360.startXfadeTimer = function() {
    var ctrl = Xbox360.controller;
    ctrl.xfade_timer = engine.beginTimer(ctrl.config.xfade_refresh,"Xbox360.xfadeListener()");
}

Xbox360.centerXfade = function() {
    engine.setValue("[Master]", "crossfader", 0);
}

Xbox360.xfadeListener = function () {
    var ctrl = Xbox360.controller;
    var dampening = 2048 / ctrl.config.xfade_speed;
    current_fade = engine.getValue("[Master]", "crossfader");
    new_fade = current_fade + (ctrl.xfade_delta_left / dampening) + (ctrl.xfade_delta_right / dampening);
    if (new_fade > 1) {
        new_fade = 1;
    } else if (new_fade < -1 ) {
        new_fade = -1;
    }
    /*
    if (ctrl.xfade_delta_left == -255 && ctrl.xfade_delta_right == 255) {
        new_fade = 0;
    } */
    engine.setValue("[Master]", "crossfader", new_fade);
}

// old jog code, now replaced with a very slow shuttle which is in fact a scratch

Xbox360.jog = function(group, field) {
    var controller = Xbox360.controller;
    engine_group = controller.resolveGroup(group);
    if (engine_group==undefined)
        return;
    if ((field.delta <= 0 && field.value > 10) || (field.delta > 0 && field.value < -10)) 
            return;
    engine.setValue(engine_group,"jog", (field.value / 32767) * -16);
}




