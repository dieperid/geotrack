<!DOCTYPE html>
<html lang="en">

<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Document</title>
</head>

<body>
	<?php
	$filePath = 'assets/gpx/file.gpx';
	$lat = [];
	$lon = [];
	$ele = [];

	if (file_exists($filePath)) {
		$fileInXml = simplexml_load_file($filePath);

		if ($fileInXml->getName() === 'gpx') {
			foreach ($fileInXml->trk->trkseg->trkpt as $point) {
				// Récupère les attributs de longitude, latitude et altitude
				array_push($lat, (float)$point['lat']);
				array_push($lon, (float)$point['lon']);
				array_push($ele, (float)$point->ele);
			}
		}
	}
	echo 'test';
	print json_encode($lat);
	?>
</body>

</html>