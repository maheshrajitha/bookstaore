let baseUrl = "http://localhost:8080"
// let adminDashboardUrl = "http://localhost:3000"

// let baseUrl = "https://tigereyejewellery.com";
let adminDashboardUrl = "/";

$(window).on("load", function () {
  $("#carousel-0").addClass("active");
  $.ajax({
    method: "GET",
    url: `${baseUrl}/users/me`,
    xhrFields: {
      withCredentials: true,
    },
    success: function (data) {
      if (data.level !== 90) {
        $("#cartListSm").removeClass("d-none");
        $("#loginSm").addClass("d-none");
        $("#cartListLg").removeClass("d-none");
        $("#loginLg").addClass("d-none");
        $("#loginNav").addClass("d-none");
        $("#logoutNav").removeClass("d-none");
        $("#firstNamePof").text(data.firstName);
        $("#lastNamePof").text(data.lastName);
        $("#emailPof").text(data.email);
      } else {
        // $("#cartListSm").removeClass("d-none");
        $("#loginSm").addClass("d-none");
        // $("#cartListLg").removeClass("d-none");
        $("#loginLg").addClass("d-none");
        $("#loginNav").addClass("d-none");
        $("#logoutNav").removeClass("d-none");
        $("#firstNamePof").text(data.firstName);
        $("#lastNamePof").text(data.lastName);
        $("#emailPof").text(data.email);
        $("#adminSm").removeClass("d-none");
        $("#adminLg").removeClass("d-none");
        $(".admin-redirect").attr("href", adminDashboardUrl);
        // window.location.replace(adminDashboardUrl)
      }
    },
    error: function (xhr) {
      console.log(xhr);
    },
  });

  $.ajax({
    method: "GET",
    url: `${baseUrl}/item/get-all-colors`,
    xhrFields: {
      withCredentials: true,
    },
    success: function (data) {
      data.forEach((color) => {
        console.log(color);
        $("#filterColor").append(
          $(`
                <option value="${color.color_name}" >${color.color_name}</option>
              `)
        );
      });
    },
    error: function (xhr) {
      console.log(xhr);
    },
  });

  $.ajax({
    method: "GET",
    url: `${baseUrl}/category/all-category`,
    xhrFields: {
      withCredentials: true,
    },
    success: function (data) {
      data.forEach((cat) => {
        $("#mainMenue").append(
          $(`
                <a class="dropdown-item" href="/category/by-category/${cat.slug}">${cat.category_name}</a>
                <div class="dropdown-divider"></div>
              `)
        );
      });

      data.forEach((cat) => {
        $("#collectionList").append(
          $(`
          <li>
          <a href="/category/by-category/${cat.slug}">${cat.category_name}</a>
        </li>
              `)
        );
      });

      data.forEach((cat) => {
        $("#catogoriesList").append(
          $(`
          <div class="col-sm-6 mb-4">
          <a href="/category/by-category/${cat.slug}">
          <img class="cat-img" src="${cat.image_url}" loading="lazy" alt="" />
          <div class="cat-name">
            <h4 class="text-center">${cat.category_name}</h4>
          </div>
          </a>
        </div>
              `)
        );
      });
    },
    error: function (xhr) {
      console.log(xhr);
    },
  });

  $.ajax({
    method: "GET",
    url: `${baseUrl}/item/get-wishlist-count`,
    xhrFields: {
      withCredentials: true,
    },
    success: function (data) {
      $("#lblWishlist").html(`${data.wishListCount}`);
      $("#lblWishlistLg").html(`${data.wishListCount}`);
    },
    error: function (xhr) {
      $("#lblWishlist").html(`0`);
      $("#lblWishlistLg").html(`0`);
    },
  });

  $.ajax({
    method: "GET",
    url: `${baseUrl}/api/item/cart-count`,
    xhrFields: {
      withCredentials: true,
    },
    success: function (data) {
      $("#lblCartCount").html(`${data.count}`);
      $("#lblCart").html(`${data.count}`);
    },
    error: function (xhr) {
      $("#lblWishlist").html(`0`);
      $("#lblWishlistLg").html(`0`);
    },
  });

  // Chnaging the default value of selected option
  var price = getUrlVars()["price"];
  $(`#filterPrice option[value='${price}']`).attr("selected", "selected");

  var colors = getUrlVars()["color"];
  $(`#filterColor option[value='${colors}']`).attr("selected", "selected");

  var gender = getUrlVars()["gender"];
  $(`#filterGender option[value='${gender}']`).attr("selected", "selected");
});

$("#single").owlCarousel({
  loop: true,
  margin: 3,
  nav: true,
  items: 1,
  navText: [
    '<span class="fa fa-chevron-left "></span>',
    '<span class="fa fa-chevron-right "></span>',
  ],
});

$("#cats").owlCarousel({
  loop: true,
  margin: 0,
  nav: true,
  navText: [
    '<span class="fa fa-chevron-left "></span>',
    '<span class="fa fa-chevron-right "></span>',
  ],
  responsiveClass: true,
  autoplay: true,
  autoplayTimeout: 3000,
  responsive: {
    0: {
      items: 1,
    },
    1000: {
      items: 3,
    },
  },
});

$("#best").owlCarousel({
  loop: true,
  margin: 0,
  nav: true,
  navText: [
    '<span class="fa fa-chevron-left "></span>',
    '<span class="fa fa-chevron-right "></span>',
  ],
  responsiveClass: true,
  autoplay: true,
  autoplayTimeout: 3000,
  responsive: {
    0: {
      items: 1,
    },
    1000: {
      items: 3,
    },
  },
});

$("[data-toggle=popover]").popover({
  html: true,
  trigger: "focus",
  content: function () {
    var content = $(this).attr("data-popover-content");
    return $(content).children(".popover-body").html();
  },
});

$("#signUpUser").submit(function (e) {
  e.preventDefault();
  let userDetails = {
    firstName: $("#firstName").val(),
    lastName: $("#lastName").val(),
    email: $("#userEmail").val(),
    password: $("#userPassword").val(),
  };
  console.log(userDetails);
  $.ajax({
    method: "POST",
    url: `${baseUrl}/users/sign-up`,
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    data: JSON.stringify({
      firstName: $("#firstName").val(),
      lastName: $("#lastName").val(),
      email: $("#userEmail").val(),
      password: $("#userPassword").val(),
    }),
    xhrFields: {
      withCredentials: true,
    },
    success: function (data) {
      $("#signUpUser")[0].reset();
      $("#signUpErr").text("");
      $("#userEmail").removeClass("input-err");
      $("#signupModal").modal("toggle");
      $("#alert").removeClass("d-none");
      $("#loginModal").modal("toggle");
    },
    error: function (xhr) {
      $("#signUpErr").text("The email is already taken !");
      $("#userEmail").addClass("input-err");
    },
  });
});

$("#loginUser").submit(function (e) {
  e.preventDefault();
  let userDetails = {
    email: $("#userLogEmail").val(),
    password: $("#userLogPassword").val(),
  };
  console.log(userDetails);
  $.ajax({
    method: "POST",
    url: `${baseUrl}/auth/login`,
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    data: JSON.stringify({
      username: $("#userLogEmail").val(),
      password: $("#userLogPassword").val(),
    }),
    xhrFields: {
      withCredentials: true,
    },
    success: function (data) {
      location.reload();
    },
    error: function (xhr) {
      console.log(xhr);
      $("#logInErr").text("Email or password is incorrect");
    },
  });
});

$("#logOut").click(function (e) {
  e.preventDefault();
  $.ajax({
    method: "DELETE",
    url: `${baseUrl}/auth/logout`,
    xhrFields: {
      withCredentials: true,
    },
    success: function (data) {
      location.reload();
    },
    error: function (xhr) {
      console.log(xhr);
    },
  });
});

function delFromWishlist(id) {
  $.ajax({
    method: "DELETE",
    url: `${baseUrl}/item/delete-wishlist-item/${id}`,
    xhrFields: {
      withCredentials: true,
    },
    success: function (data) {
      location.reload();
    },
  });
}

function addTowishList(id) {
  $.ajax({
    method: "GET",
    url: `${baseUrl}/auth/is-logged`,
    xhrFields: {
      withCredentials: true,
    },
    success: function (data) {
      if (data.logged) {
        $.ajax({
          method: "POST",
          url: `${baseUrl}/item/add-to-wishlist`,
          contentType: "application/json; charset=utf-8",
          dataType: "json",
          data: JSON.stringify({
            itemId: id,
          }),
          xhrFields: {
            withCredentials: true,
          },
          success: function (data) {
            $(`#${id}wishlist`).addClass("active-wishlist");
            var el = parseInt($("#lblWishlist").text());
            $("#lblWishlist").text(el + 1);
            $("#lblWishlistLg").text(el + 1);
          },
        });
      } else {
        $("#loginModal").modal("show");
      }
    },
  });
}

$("#filterForm").submit(function (e) {
  e.preventDefault();
  let price = $("#filterPrice").val();
  let gender = $("#filterGender").val();
  let color = $("#filterColor").val();

  let path = `?price=${price}`;

  if (color !== "all") {
    path = path.concat(`&color=${color}`);
  }

  if (gender !== "all") {
    path = path.concat(`&gender=${gender}`);
  }

  window.location.replace(path);
});

function getUrlVars() {
  var vars = [],
    hash;
  var hashes = window.location.href
    .slice(window.location.href.indexOf("?") + 1)
    .split("&");
  for (var i = 0; i < hashes.length; i++) {
    hash = hashes[i].split("=");
    vars.push(hash[0]);
    vars[hash[0]] = hash[1];
  }
  return vars;
}

$("#filterReset").click(function (e) {
  e.preventDefault();
  var uri = window.location.toString();
  if (uri.indexOf("?") > 0) {
    var clean_uri = uri.substring(0, uri.indexOf("?"));
    console.log();
    window.location.replace(clean_uri);
  }
});

// if HTML DOM Element that contains the map is found...
if (document.getElementById("map-canvas")) {
  var mapProp = {
    center: new google.maps.LatLng(51.508742, -0.12085),
    zoom: 5,
  };
  var map = new google.maps.Map(document.getElementById("map-canvas"), mapProp);

  // var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
}
var x = document.getElementById("sizeOption").value;
var qty = $(`#quantitySelect option[value='quantityVal${x}']`).html();
$("#quantity").prop("max", qty);

function sizeOnSelect() {
  var x = document.getElementById("sizeOption").value;
  $(`#priceselect option[value='${x}']`).prop("selected", "selected");
  $(`#sizeIds option[value='${x}']`).prop("selected", "selected");
  $(`#quantitySelect option[value='${x}']`).prop("selected", "selected");
  var qty = $(`#quantitySelect option[value='quantityVal${x}']`).html();

  if (qty > 0) {
    $("#quantity").prop("max", qty);
  }
  console.log(qty);
}

$("#addToCart").click(function(e){
  // alert($(this).attr("data-itemId"))
  $.ajax({
    method: "POST",
    url: `${baseUrl}/api/item/add-to-cart`,
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    data: JSON.stringify({
      itemId: $(this).attr("data-itemId"),
      size:$("#sizeIds option:selected").text()
    }),
    xhrFields: {
      withCredentials: true,
    },
    success: function (data) {
      $.toast({
        heading: 'OK',
        text: 'Successfully Item Added To Cart',
        showHideTransition: 'slide',
        icon: 'success'
      })
    },
    error: function (xhr) {
      // $("#signUpErr").text("The email is already taken !");
      // $("#userEmail").addClass("input-err");
      if(xhr.status === 401)
        $("#loginModal").modal("toggle");
      else if(xhr.status === 400){
        $.toast({
          heading: 'Warning',
          text: 'Invalid Item',
          showHideTransition: 'slide',
          icon: 'warning'
        })
      }
    },
  });
})

$(".remove-cart-btn").click(function(e){
  $.ajax({
    method: "DELETE",
    url: `${baseUrl}/api/item/remove-from-cart/${$(this).attr("data-itemId")}`,
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    xhrFields: {
      withCredentials: true,
    },
    success: function (data) {
      $.toast({
        heading: 'OK',
        text: 'Successfully Remove From Cart',
        showHideTransition: 'slide',
        icon: 'success'
      })
      window.location.reload()
    },
    error: function (xhr) {
      // $("#signUpErr").text("The email is already taken !");
      // $("#userEmail").addClass("input-err");
      if(xhr.status === 401)
        $("#loginModal").modal("toggle");
      else if(xhr.status === 400){
        $.toast({
          heading: 'Warning',
          text: 'Invalid Item',
          showHideTransition: 'slide',
          icon: 'warning'
        })
      }
    },
  });
})