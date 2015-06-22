(function()
{
    'use strict';

    var btnGenerate = document.getElementById("btnGenerate");

    // When the button is pressed
    btnGenerate.addEventListener("click", function()
    {
        var files = document.getElementById("input_file").files;

        // Make sure only one file was selected
        if (files.length != 1)
        {
            alert("Choose one file, and one file only!");
            return;
        }

        this.disabled = true;
        this.innerText = "Generating, please wait...";

        // Read the file
        var fileReader = new FileReader();
        fileReader.onload = imageLoadedCallback;
        fileReader.readAsDataURL(files.item(0));
    });

    /**
     * @brief Draws an hexagon with the given attributes in a canvas
     *
     * @param canvas The canvas where the hexagon will be drawn onto
     * @param x The horizontal position of the center of the hexagon
     * @param y The vertical position of the center of the hexagon
     * @param size The size of the hexagon
     * @param color The color of the hexagon
     */
    var drawHexagon = function (canvas, x, y, size, color)
    {
        // Just in case... you know
        var numberOfSides = 6;
        var ctx = canvas.getContext("2d");

        // This is just to blank spaces between hexagons
        size += 0.5;

        ctx.beginPath();
        ctx.moveTo (x +  size * Math.cos(0), y +  size *  Math.sin(0));

        for (var i = 1; i <= numberOfSides;i += 1) {
            ctx.lineTo (
                x + size * Math.cos(i * 2 * Math.PI / numberOfSides),
                y + size * Math.sin(i * 2 * Math.PI / numberOfSides)
            );
        }

        ctx.fillStyle = color;
        ctx.fill();
    }

    /**
     * @brief Returns the average color in hexadecimal format for a certain imageData
     *
     * @param  The ImageData object with the pixel information
     * @return The average color in hexadecimal format as a string
     */
    var averageImageData = function(imageData)
    {
        var pixels     = imageData.data;
        var pixelCount = imageData.width * imageData.height;
        var quality = 10;
        var realPixelCount = 0;
        var reds = 0, greens = 0, blues = 0;

        for (var i = 0; i < pixelCount; i = i + quality)
        {
            reds += pixels[i * 4 + 0];
            greens += pixels[i * 4 + 1];
            blues += pixels[i * 4 + 2];

            realPixelCount ++;
        }

        // Compute the averages
        var avg = [Math.floor(reds / realPixelCount), Math.floor(greens / realPixelCount), Math.floor(blues / realPixelCount)];

        // Generate the hexadecimal code of the color
        var hex = "#" + avg.map(function(f) { return (f+0x100).toString(16).substr(-2).toUpperCase();}).join("");

        return hex;
    };

    /**
     * @brief Does the big thingy
     *
     * @param  e The event
     */
    var imageLoadedCallback = function(e)
    {
        // Create a temporal image
        var img = new Image();

        // Fill the image with the read file
        img.src = e.target.result;

        // Create a temporal canvas
        var canvas = document.createElement("canvas");
        var context = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw the image onto the temporal canvas
        context.drawImage(img, 0, 0);

        // Get the output canvas
        var outcanvas = document.getElementById("doc_canvas");
        var outcontext = outcanvas.getContext("2d");

        // Match the image size
        outcanvas.width = img.width;
        outcanvas.height = img.height;

        // Clear the output canvas
        outcontext.clearRect(0, 0, outcanvas.width, outcanvas.height);

        // Calculate the sizes of the hexagons
        var size = parseInt(document.getElementById("input_size").value, 10);
        var hexWidth = size * 2;
        var hexHeight = Math.sqrt(3) * size;
        var hexHalfHeight = hexHeight / 2;
        var horizontalSeparation = 3 * size;
        var verticalSeparation = hexHalfHeight;

        var softening = parseFloat(document.getElementById("input_transition").value);
        var averageHorizontalRadius = softening * size;
        var averageVerticalRadius = softening * hexHalfHeight;

        // Calculate the number of hexagons to draw
        var gridWidth = Math.ceil(img.width / (hexWidth + size)) + 1;
        var gridHeight = Math.ceil(img.height / hexHalfHeight) + 1;

        console.group("Info");
        console.log("Image size: %i x %i", img.width, img.height);
        console.log("Hexagon size: %f", size);
        console.log("Hexagon width: %f", hexWidth);
        console.log("Hexagon height: %f", hexHeight);
        console.log("Grid width : %i", gridWidth);
        console.log("Grid height: %i", gridHeight);
        console.log("Total hexagons: %i", gridWidth * gridHeight);

        console.groupEnd();

        // For each hexagon to draw

        for (var gridY = 0; gridY < gridHeight; ++gridY)
        {
            for (var gridX = 0; gridX < gridWidth; ++gridX)
            {
                // Compute the position of the hexagon (center)
                // Hexagons in uneven rows are offset 1.5 * size
                var hexX = gridX * horizontalSeparation + Math.floor((gridY % 2) * 1.5 * size);
                var hexY = gridY * verticalSeparation;

                // console.log("Row %i, Col %i, X %i, Y %i", gridY, gridX, hexX, hexY);

                // Make sure we don't pick unexisting pixels to make the average
                // in the hexagons close to the borders
                var piece_x = Math.max(0, hexX - averageHorizontalRadius),
                    piece_y = Math.max(0, hexY - averageVerticalRadius);

                // Don't paint hexagons out of place
                if (piece_x > canvas.width || piece_y > canvas.height)
                    continue;

                if (piece_x + averageHorizontalRadius * 2 > canvas.width)
                {
                    var piece_w = canvas.width - piece_x;
                }
                else
                {
                    var piece_w = averageHorizontalRadius * 2;
                }

                if (piece_y + averageVerticalRadius * 2 > canvas.height)
                {
                    var piece_h = canvas.height - piece_y;
                }
                else
                {
                    var piece_h = averageVerticalRadius * 2;
                }

                try
                {
                    // Crop the piece from the original image
                    var pieceData = context.getImageData(
                        piece_x,
                        piece_y,
                        piece_w,
                        piece_h);

                    // Compute the average color on that spot
                    var color = averageImageData(pieceData);

                    // Draw an hexagon in that place
                    drawHexagon(
                        outcanvas,
                        hexX,
                        hexY,
                        size,
                        color);

                }
                catch (err)
                {
                    console.log("Error", err);
                    continue;
                }
            }
        }

        console.log("End");

        // Restore the Generate button
        btnGenerate.disabled = false;
        btnGenerate.innerText = "Generate!";

        // Show the download instructions and the generated wallpaper size
        document.getElementsByClassName("download-instructions")[0].style.display = "block";
        document.getElementsByClassName("wallpaper-size")[0].innerText = outcanvas.width + "x" + outcanvas.height;
    };
}());