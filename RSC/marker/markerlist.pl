#!/usr/bin/perl

# http://orange-factory.com/dnf/perlmodule_json.html
# http://d.hatena.ne.jp/perlcodesample/20100427/1270894115
# http://d.hatena.ne.jp/punitan/20100410/1270927420

#use lib qw(/home/osada/perl5/lib/perl5);

use Time::Local 'timelocal';

use Encode;
use utf8;
binmode STDIN, ":utf8";
binmode STDOUT, ":utf8";
use JSON;

#my $idbase = $ARGV[0];
#my $targetdir = $ARGV[1];
#my $bfile = $ARGV[2];

# ファイルの内容を取得する関数
sub get_json_content {
  my $file = shift;
  open my $fh, '<', $file
    or die "Can't open file \"$file\": $!";
  binmode $fh, ":utf8";
  my $content = do { local $/; <$fh> };
  close $fh;
  return $content;
}

#my $basejson = JSON->new->utf8(0)->decode(get_json_content($bfile));
my ($sec, $min, $hour, $mday, $mon, $year, $wday, $yday, $isdst) = localtime;

	
my @icon_files = glob "*.gif *.png";

my $page = 1;
my $pagemax = 48; # 7 x 7 - 1(default)
my @cnt = ();
my %result = ();
my $filenamebase = "markerlist";

for (my $i = 0; $i <= $#icon_files; $i++){

    push( @cnt, $icon_files[$i] );

    if ( $#cnt == $pagemax - 1 || $i == $#icon_files ) {

	$result->{"date"} = $year . $mon . $mday;
	$result->{"uri"} = \@cnt;
	$result->{"page"} = $page;

	my $fullname = $filenamebase . $page . ".json";
	open (OUT, "> $fullname") or die "$!";
	binmode OUT, ":utf8";
	my $json_out = JSON->new->utf8(0)->encode($result);
	print OUT $json_out;
	close OUT;

	@cnt = ();
	%result = ();
	$page++;
    }
}

exit;
