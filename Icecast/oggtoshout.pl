#!/usr/bin/perl

# ogg2shout.pl - transocde from ogg icecast server to shoutcast mp3 server.
# Modifications by Simon Plexus, iwtf.net
# Modifications by Shiz <hi@shiz.me>
# Adapted from ice-downcoder.pl code by Jamie Zawinksi <jwz@dnalounge.com>

require 5;
use strict;
use bytes;

require POSIX;
use POSIX qw(locale_h setlocale);

use Socket;
use IO::Select;
use IPC::Open2;

use Shout;

# Adjust this to your desired sample rate. 44.1 = 44100 khz
my $srates = '44.1';


my $progname = $0; $progname =~ s@.*/@@g;
my $version = q{ $Revision: 1.20 $ }; $version =~ s/^[^0-9]+([0-9.]+).*$/$1/;

my $verbose = 2;
my $public_p = 0;
my $parent_pid = undef;

my $timeout = 10;    # if no data read for this many seconds, exit.

my $report_underflows = 0;   # we only report bitrate underflows when we
                             #  are simply copying, not downcoding.
my $bps;
my $downsample_cmd;
my $liveaudio_cmd = "";


my $liveaudio_loc   = "";
my $liveaudio_name  = "";
my $liveaudio_desc  = "";
my $liveaudio_iurl  = "";
my $liveaudio_genre = "";


my %downsample_opts = (   8 => "-b   8 -a --resample 16",
                         16 => "-b  16 -a --resample 22.05",
                         24 => "-b  24 -a --resample 22.05",
                         32 => "-b  32 -a --resample 32",
                         40 => "-b  40 -a --resample 32",
                         48 => "-b  48 -a --resample 32",
                         56 => "-b  56 -a --resample 44.1",
                         64 => "-b  64    --resample 22.05",
                         80 => "-b  80    --resample 22.05",
                         96 => "-b  96    --resample 44.1",
                        112 => "-b 112    --resample 44.1",
                        128 => "--preset 128 -mj -h",
                        144 => "-b 144    --resample 22.05",
                        160 => "-b 160    --resample 48"
                       );


sub relay {
  my ($in_url, $out_url, $bps, $pass) = @_;

  my $live_p = !defined($in_url);
  $downsample_cmd = "ogg123 -d raw -f - - | lame -b $bps -m s -r -s $srates - -";
  my $cmd = ($live_p ? $liveaudio_cmd : $downsample_cmd);
  my $opts = $downsample_opts{128};
  die "$progname: unsupported bitrate $bps.\n" unless $opts;
  $cmd =~ s/%OPTS%/$opts/g;


  my ($loc, $name, $desc, $iurl, $genre, $ibps, $pub);

  if (!$live_p) {

    #########################################################################
    #
    # Reading MP3 data from an Icecast URL.
    # Open the input stream and read the headers
    #
    #########################################################################


    my($url_proto, $dummy, $serverstring, $path) = split(/\//, $in_url, 4);
    if (! ($url_proto && $url_proto =~ m/^http:$/i)) {
      die "$progname: not an HTTP URL: $in_url\n";
    }

    $path = "" unless $path;

    my ($them,$port) = split(/:/, $serverstring);
    $port = 80 unless $port;

    print STDERR "$progname: $$: connecting to $serverstring...\n"
      if (($verbose > 1) ||
          ($verbose == 1 && $report_underflows));

    my ($remote, $iaddr, $paddr, $proto, $line);
    $remote = $them;
    if ($port =~ /\D/) { $port = getservbyname($port, 'tcp') }
    $port || die "$progname: getservbyname($port, 'tcp')";
    $iaddr = inet_aton($remote) || die "$progname: inet_aton($remote)";
    $paddr = sockaddr_in($port, $iaddr);

    $proto   = getprotobyname('tcp');
    socket(IN, PF_INET, SOCK_STREAM, $proto) || die "$progname: socket: $!\n";
    connect(IN, $paddr) || die "$progname: connect($serverstring): $!\n";

    select(IN); $| = 1; select(STDOUT);

    print IN ("GET /$path HTTP/1.0\r\n" .
              "Host: $them\r\n" .
              "User-Agent: $progname/$version\r\n" .
              "\r\n");
    my $http = <IN>;

    if (! ($http =~ m@^HTTP/1.\d+ 2\d\d\b@ ||
           $http =~ m@^ICY 2\d\d\b@ )) {
      $http =~ s/[\r\n]+$//gs;
      $http = "null response" if ($http =~ m/^\s*$/s);
      die "$progname: $http\n";
    }

    my $head = "";
    while (<IN>) {
      s/\r\n$/\n/;
      $head .= $_;
      last if m@^\n@;
    }

    $_ = $head;
    my $X;
    ($X, $loc)      = m/^(x-audiocast|icy|ice)-location:[ \t]*([^\n]*)$/mi;
    ($X, $name)     = m/^(x-audiocast|icy|ice)-name:[ \t]*([^\n]*)$/mi;
    ($X, $X, $desc)=m/^(x-audiocast|icy|ice)-desc(ription)?:[ \t]*([^\n]*)$/mi;
    ($X, $iurl)     = m/^(x-audiocast|icy|ice)-url:[ \t]*([^\n]*)$/mi;
    ($X, $genre)    = m/^(x-audiocast|icy|ice)-genre:[ \t]*([^\n]*)$/mi;
    ($X, $pub)      = m/^(x-audiocast|icy|ice)-public:[ \t]*([^\n]*)$/mi;
    ($X, $X, $ibps) = m/^(x-audiocast|icy|ice)-(bitrate|br):[ \t]*([^\n]*)$/mi;

    $loc = $name unless $loc;

  } else {

    #########################################################################
    #
    # Reading raw audio data from the local machine's sound card.
    # Open the input pipeline set up the header data.
    #
    #########################################################################

    $loc   = $liveaudio_loc;
    $name  = $liveaudio_name;
    $desc  = $liveaudio_desc;
    $iurl  = $liveaudio_iurl;
    $genre = $liveaudio_genre;
    $ibps  = $bps;
    $pub   = $public_p;
  }

  my $ibps_suffix = "";
  if (!defined ($ibps)) {
    $ibps = 128;
    $ibps_suffix = " (assumed)";
  }

  if ($verbose > 1) {
    print STDERR "$progname: reading from " .
          ($live_p ? "sound card" : $in_url) . ":\n" .
      "$progname:   location:    $loc\n" .
      "$progname:   name:        $name\n" .
      "$progname:   description: $desc\n" .
      "$progname:   url:         $iurl\n" .
      "$progname:   genre:       $genre\n" .
      "$progname:   bitrate:     $ibps$ibps_suffix\n" .
      "$progname:   public:      $pub\n";
  }

  ###########################################################################
  #
  # Open the output stream and write the headers
  #
  ###########################################################################

  my ($url_proto, $dummy, $serverstring, $path) = split(/\//, $out_url, 4);
  if (! ($url_proto && $url_proto =~ m/^http:$/i)) {
    die "$progname: not an HTTP URL: $out_url\n";
  }

  $path = "" unless $path;

  my ($them, $port) = split(/:/, $serverstring);
  $port = 80 unless $port;

  print STDERR "$progname: writing to http://$them:$port/$path\n"
    if (($verbose > 1) ||
        ($verbose == 1 && $report_underflows));

  my $server_protocol;				# Shout 1.1
  $server_protocol = SHOUT_PROTOCOL_HTTP;
  my $conn = new Shout
    host  		=> $them,		# Shout 1.1
    port		=> $port,
    mount		=> $path,
    password		=> $pass,
    dumpfile		=> undef,
    name		=> $name,
    url			=> $iurl,
    genre		=> $genre,
    description		=> $desc,
    bitrate		=> $bps,		# Shout 1.0
    format		=> SHOUT_FORMAT_MP3,	# Shout 1.1
    protocol		=> $server_protocol,    # Shout 1.1 for icecast2
    public		=> $public_p    # set this to what "--public" said
      ;

  if (! $conn->open) {				# Shout 1.1
    print STDERR "$progname: couldn't connect: " . $conn->get_error . "\n";
  }

  if ($verbose > 1) {
    print STDERR "$progname: writing to $out_url:\n";
    print "$progname:   bitrate:     $bps\n";
    print "$progname:   public:      $public_p\n" if ($pub != $public_p);
  }


  ###########################################################################
  #
  # Open the filtering pipe...
  #
  ###########################################################################
 my $holder = '3';
    print STDERR "$progname: filter: $cmd\n" if ($verbose > 1);
    local *Reader;
    local *Writer;
    local *ErrorReader;
    local *ErrorWriter;

    pipe (Reader, Writer) || die "$progname: pipe: $!\n";
    pipe (ErrorReader, ErrorWriter) || die "$progname: pipe: $!\n";

    my $pid = fork;
    if ($pid < 0) { die "$progname: fork: $!\n"; }
    if ($pid) {

      if (!$live_p) {
        open (STDIN, "<&IN")    || die "$progname: dup stdin: $!\n";
      }

      open (STDOUT, ">&Writer") || die "$progname: dup stdout: $!\n";
      open (STDERR, ">&ErrorWriter") || die "$progname: dup stderr: $!\n";
      exec "$cmd"               || die "$progname: exec $cmd: $!\n";
    }
    open (IN, "<&Reader")       || die "$progname: dup stdin: $!\n";
    open (ERR, "<&ErrorReader") || die "$progname: dup stderr: $!\n";
    $| = 1;


  ###########################################################################
  #
  # Copy the data from in to out...
  #
  ###########################################################################

  my ( $buffer, $bytes ) = ( '', 0 );
  my $select = IO::Select->new();
  $select->add(\*IN);
  $select->add(\*ERR);
  my ($artist, $title, $sent) = (undef, undef, 0);
  my $locale = uc(split(/\./, setlocale(LC_ALL))[1] || 'ascii')

  # Read from stdout and stderr handles.
  while (my @ready = $select->can_read($timeout)) {
    foreach my $handle (@ready) {
      # Send stdout data to stream, it's converted MP3 data.
      if (fileno($handle) == fileno(*IN)) {
        sysread (IN, $buffer, 4096);

        my $L = length($buffer);
        print STDERR "$progname: writing $L bytes\n" if ($verbose > 3);

        $conn->sendData ($buffer) || die "$progname: write: ", $conn->error, "\n";
        print STDERR "$progname: wrote $L bytes\n" if ($verbose > 2);
      # Parse stderr data for metadata and send it ourselves.
      } elsif (fileno($handle) == fileno(*ERR)) {
        sysread (ERR, $buffer, 4096);

        # A new track switch.
        if ($buffer =~ m/Ogg Vorbis stream/) {
           print STDERR "Track switch detected.\n" if ($verbose > 1);
           $artist = undef;
           $title = undef;
           $sent = 0;
        }
        # The track artist.
        if ($buffer =~ m/Artist: (.*)/m) {
           print STDERR "Artist: $1\n" if ($verbose > 1);
           $artist = $1;
        }
        # The track title.
        if ($buffer =~ m/Title: (.*)/m) {
           print STDERR "Title: $1\n" if ($verbose > 1);
           $title = $1;
        }
        # Metadata block is done, send the data.
        if ($sent == 0 && $buffer =~ m/Time:/m) {
           my $ttitle = '';
           if ($artist) {
             $ttitle = "$artist - $title";
           } else {
             $ttitle = $title;
           }

           print STDERR "Sending song title $ttitle...\n" if ($verbose);
           $conn->set_metadata(song => $ttitle, charset => $locale);
           $sent = 1;
        }
      }
    }
  }
  print STDERR "$progname: EOF!\n" if ($verbose);


  ###########################################################################
  #
  # Done: hit end of input stream.
  #
  ###########################################################################

  $conn->disconnect;
  close IN;
}


sub usage {
  my ($whine) = @_;
  print STDERR "$progname: $whine\n" if $whine;
  print STDERR "usage: $progname [--verbose] [--public] " .
    "in-url out-url bitrate password\n";
  exit 1;
}

sub main {
  my ($in_url, $out_url, $bps, $pass);

  while ($_ = $ARGV[0]) {
    shift @ARGV;
    if ($_ eq "--verbose") { $verbose++; }
    elsif (m/^-v+$/) { $verbose += length($_)-1; }
    elsif ($_ eq "--public") { $public_p++; }
    elsif (m/^-/) { usage "unknown option $_"; }
    elsif (!defined($in_url)) {
      if ($_ ne "soundcard" &&
          ! m@^http://@) { usage "not an HTTP URL: $_"; }
      $in_url = $_;
    } elsif (!defined($out_url)) {
      if (! m@^http://@) { usage "not an HTTP URL: $_"; }
      $out_url = $_;
    } elsif (!defined($bps)) {
      if (! m/^\d+$/) { usage "non-numeric BPS: $_"; }
      $bps = $_;
    } elsif (!defined($pass)) {
      $pass = $_;
    } else {
      usage "unknown option: $_";
    }
  }

  usage "no input URL" unless $in_url;
  usage "no output URL" unless $out_url;
  usage "no BPS" unless $bps;
  usage "no password" unless $pass;

  $in_url = undef if ($in_url eq "soundcard");

  $_ = $out_url;
  s@^.*/@@;
  $progname =~ s/\.pl$//;
  $progname .= ": $_";

  $parent_pid = $$;
  relay ($in_url, $out_url, $bps, $pass);
}

main;
exit (0);
