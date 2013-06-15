--[[
For help on MidiHID configurations or to share configurations with other MidiHID users,
visit http://http://code.google.com/p/midihid/.

The "base", "string", "table" and "math" Lua libraries are available. MidiHID provides
an extra "midi" library with the following functions:
	midi.message(message, [data1], [data2])
	midi.noteon(key, [velocity])
	midi.noteoff(key, [velocity])
	midi.controlchange(control, value)
	midi.pitchwheelchange(value)
These functions do not return anything and all their arguments are numerical values
between 0-127 (except for "message" which must be between 0-15).
Arguments in brackets are optional.

To print a message to the log area, use the log() function.
]]

function _connect()
    log("<CONNECT>")
end

-- utilities

function round(num, idp)
  local mult = 10^(idp or 0)
  return math.floor(num * mult + 0.5) / mult
end

function send_midi_note(id, value)
    if value ~= 0 then
        midi.noteon(id, 127)
    else
        midi.noteoff(id, 127)
    end
end

function minmax_wrapper(value, min, max)
    return round(((value - min) / (max - min) * 127  + 0.5), 2)
end

-- center buttons
function Button_11(value, min, max)
    id = 41
    log("<GUIDE> = " .. id .. " " .. ((value ~= 0) and "ON" or "OFF"))
    send_midi_note(id, value)
end
function Button_10(value, min, max)
    id = 42
    log("<BACK> = " .. id .. " " .. ((value ~= 0) and "ON" or "OFF"))
    send_midi_note(id, value)
end
function Button_9(value, min, max)
    id = 43
    log("<START> = " .. id .. " " .. ((value ~= 0) and "ON" or "OFF"))
    send_midi_note(id, value)
end

-- face buttons

function Button_1(value, min, max)
    id = 51
    log("<A> = " .. id .. " " .. ((value ~= 0) and "ON" or "OFF"))
    send_midi_note(id, value)
end
function Button_2(value, min, max)
    id = 52
    log("<B> = " .. id .. " " .. ((value ~= 0) and "ON" or "OFF"))
    send_midi_note(id, value)
end
function Button_3(value, min, max)
    id = 53
    log("<X> = " .. id .. " " .. ((value ~= 0) and "ON" or "OFF"))
    send_midi_note(id, value)
end
function Button_4(value, min, max)
    id = 54
    log("<Y> = " .. id .. " " .. ((value ~= 0) and "ON" or "OFF"))
    send_midi_note(id, value)
end

-- bumpers

function Button_5(value, min, max)
    id = 61
    log("<LB> = " .. id .. " " .. ((value ~= 0) and "ON" or "OFF"))
    send_midi_note(id, value)
end
function Button_6(value, min, max)
    id = 62
    log("<RB> = " .. id .. " " .. ((value ~= 0) and "ON" or "OFF"))
    send_midi_note(id, value)
end

-- dpad

function Button_12(value, min, max)
    id = 71
    log("<DU> = " .. id .. " " .. ((value ~= 0) and "ON" or "OFF"))
    send_midi_note(id, value)
end
function Button_13(value, min, max)
    id = 72
    log("<DD> = " .. id .. " " .. ((value ~= 0) and "ON" or "OFF"))
    send_midi_note(id, value)
end
function Button_14(value, min, max)
    id = 73
    log("<DL> = " .. id .. " " .. ((value ~= 0) and "ON" or "OFF"))
    send_midi_note(id, value)
end
function Button_15(value, min, max)
    id = 74
    log("<DR> = " .. id .. " " .. ((value ~= 0) and "ON" or "OFF"))
    send_midi_note(id, value)
end

-- stick clicks

function Button_7(value, min, max)
    id = 81
    log("<LSC> = " .. id .. " " .. ((value ~= 0) and "ON" or "OFF"))
    send_midi_note(id, value)
end
function Button_8(value, min, max)
    id = 82
    log("<RSC> = " .. id .. " " .. ((value ~= 0) and "ON" or "OFF"))
    send_midi_note(id, value)
end

-- triggers

function Z(value, min, max)
    id = 2
    midival = minmax_wrapper(value, min, max)
    log("<LT> = " .. id .. " " .. midival)
    midi.controlchange(id, midival)
end
function Rz(value, min, max)
    id = 3
    midival = minmax_wrapper(value, min, max)
    log("<RT> = " .. id .. " " .. midival)
    midi.controlchange(id, midival)
end

-- left stick

function X(value, min, max)
    id = 4
    midival = minmax_wrapper(value, min, max)
    log("<LSX> = " .. id .. " " .. midival)
    midi.controlchange(id, midival)
end
function Y(value, min, max)
    id = 5
    midival = minmax_wrapper(value, min, max)
    log("<LSY> = " .. id .. " " .. midival)
    midi.controlchange(id, midival)
end

-- right stick

function Rx(value, min, max)
    id = 6
    midival = minmax_wrapper(value, min, max)
    log("<RSX> = " .. id .. " " .. midival)
    midi.controlchange(id, midival)
end
function Ry(value, min, max)
    id = 7
    midival = minmax_wrapper(value, min, max)
    log("<RSY> = " .. id .. " " .. midival)
    midi.controlchange(id, midival)
end


-- this catches the rest
function _event(name, value, min, max)
    log("[" .. name .. "] = " .. value .. " (" .. min .. " | " .. max .. ")")
    midi.controlchange(1, (value - min) / (max - min) * 127)
end



function _disconnect()
	log("<DISCONNECT>")
end
