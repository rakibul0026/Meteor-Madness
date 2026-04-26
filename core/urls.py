from django.urls import path

from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("p2.html", views.home, name="home_html"),
    path("controls.html", views.controls_page, name="controls"),
    path("dashboard.html", views.dashboard_page, name="dashboard"),
    path("Prediction.html", views.prediction_page, name="prediction_caps"),
    path("prediction.html", views.prediction_page, name="prediction"),
    path("asteroid_watch.html", views.asteroid_watch_page, name="asteroid_watch"),
    path("p.html", views.research_page, name="research"),
    path("team_member.html", views.team_page, name="team_members"),
    path("api/predictions/", views.predictions_api, name="predictions_api"),
    path("api/nasa/neo-feed/", views.nasa_neo_feed_api, name="nasa_neo_feed_api"),
    path("api/nasa/apod/", views.nasa_apod_api, name="nasa_apod_api"),
    path("api/nasa/mars/latest/", views.nasa_mars_latest_api, name="nasa_mars_latest_api"),
]
