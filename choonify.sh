#!/bin/bash

if [ "$#" -lt 2 ]; then
     echo "usage: $0 [boring.app] [choon.mp3]"
     exit 1
fi

APP=$1
CHOON=$2
EXEC=$(grep -A1 CFBundleExecutable "$APP/Contents/Info.plist" | tail -n1 | sed -e 's#<[^>]*>##g;s/^[	 ]*//;s/[	 ]*$//')

cp "$CHOON" "$APP/Contents/Resources/_choon.mp3"
mv "$APP/Contents/MacOS/$EXEC" "$APP/Contents/MacOS/old-$EXEC"

cat > "$APP/Contents/MacOS/$EXEC" <<-EOF
	#\!/bin/bash

	BASE=\$(dirname "\$0")

	function play_core {
	    while afplay "\$BASE/\$1"; do true; done
	}

	function play {
	    (play_core "\$1" 2>/dev/null &)
	}

	function stop {
	    killall afplay
	}


	play "../Resources/_choon.mp3"
	"\$BASE/old-$EXEC"
	stop
EOF
chmod +x "$APP/Contents/MacOS/$EXEC"
