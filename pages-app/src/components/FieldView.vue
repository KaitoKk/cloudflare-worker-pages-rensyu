<template>
<b-container>
  <b-row>
    <b-col sm="1"><b-icon-file-text></b-icon-file-text></b-col>
    <b-col><b-form-textarea rows="2" v-model="text"></b-form-textarea></b-col>
  </b-row>

  <b-row v-if="lat && lon">
    <b-col sm="1"><b-icon-file-text></b-icon-file-text></b-col>
    <b-col>Lat: {{lat}} Lon: {{lon}}</b-col>
    <b-col>
      <b-form-select v-model="location" :options="locations"></b-form-select>
    </b-col>
  </b-row>

  <b-row>
    <b-col sm="1"><b-icon-file-image></b-icon-file-image></b-col>
    <b-col>
      <b-form-file @change="onFileChange" accept="image/*" ref="fileInput" multiple placeholder="Selected file show in below"></b-form-file>
    </b-col>
  </b-row>

  <b-row v-for="image in images" :key="image.idx">
    <b-col sm="1"></b-col>
    <b-col sm="3"><img :src="image.url" style="max-width: 200px; max-height: 200px; object-fit: cover;"/></b-col>
    <b-col><b-button @click="removeImage(image.idx)"><b-icon-trash></b-icon-trash></b-button></b-col>
  </b-row>

  <b-row>
    <b-col sm="1">
      <b-button @click="upload" :disabled="uploadState.disabled">
        <b-icon-pencil-square :animation="uploadState.animate"></b-icon-pencil-square>
      </b-button>
    </b-col>
    <b-col sm="1">
      <b-button @click="fetch" :disabled="fetchState.disabled">
        <b-icon-arrow-clockwise :animation="fetchState.animate"></b-icon-arrow-clockwise>
      </b-button>
    </b-col>
    <b-col sm="1">
      <b-button @click="changeLocState" :disabled="locationState.disabled">
        <b-icon-geo v-if="allowState.loc" :animation="locationState.animate"></b-icon-geo>
        <b-iconstack v-else>
          <b-icon-geo stacked></b-icon-geo><b-icon-slash-circle stacked scale="1.5"></b-icon-slash-circle>
        </b-iconstack>
      </b-button>
    </b-col>
  </b-row>
  <hr />
</b-container>
</template>

<script lang="ts">
import axios from "axios"
import { Param as ParamType } from "@/types/Post"

export default {
  name: 'FieldView',
  data: () => {
    return {
      uploadState: {
        disabled: false,
        animate: ''
      },
      fetchState: {
        disabled: false,
        animate: ''
      },
      locationState: {
        disabled: false,
        animate: ''
      },
      text: '',
      lat: '',
      lon: '',
      location: '---',
      images: [],
      locations: ['---'],
      allowState: {
        loc: true
      }
    }
  },
  created: async function () {
    this.getPosition()
    await this.fetch()
  },
  methods: {
    onFileChange(e) {
      this.images = []
      let idx = 0
      for (const file of e.target.files) {
        this.images.push({idx, blob: file, url: URL.createObjectURL(file)})
        idx++
      }
    },
    getPosition: function () {
      this.locationState.animate = 'fade'
      navigator.geolocation.getCurrentPosition((pos) => {
        this.lat = pos.coords.latitude
        this.lon = pos.coords.longitude

        this.locationState.animate = ''
        this.getLocation()
      }, function (err) {
        console.log(err)
      }, {
        enableHighAccuracy: true
      })
    },
    async getLocation() {
      if (this.lat == '' && this.lon == '') return

      const result = await axios.get(`${process.env.VUE_APP_ARTICLE_API}/nearby/${this.lat}/${this.lon}`)
      this.locations = result.data.locations
      this.locations.unshift('---')
    },
    async upload() {
      this.uploadState.animate = 'fade'
      this.uploadState.disabled = true

      let image_urls = []
      for (const image of this.images) {
        const formData = new FormData()
        formData.append('image', image.blob)
        let image_result = await axios.post(
            `${process.env.VUE_APP_UPLOAD_API}/images/upload`,
            formData,
            {headers: {'context-type': 'multipart/form-data'}}
        )

        image_urls.push(`${process.env.VUE_APP_UPLOAD_API}/images/${image_result.data.id}`)
      }
      const postData = {
        text: this.text,
        lat: this.lat,
        lon: this.lon,
        location: this.location,
        images: image_urls
      } as ParamType

      const result = await axios.post(`${process.env.VUE_APP_ARTICLE_API}/posts`, postData)

      this.$parent.posts.unshift(result.data.id)
      this.uploadState.animate = ''
      this.uploadState.disabled = false

      this.text = ''
      this.location = '---'
      this.locations = ['---']
      this.images = []
      this.getPosition()
    },
    async fetch() {
      this.fetchState.animate = 'spin'
      this.fetchState.disabled = true

      const result = await axios.get(`${process.env.VUE_APP_ARTICLE_API}/`)

      this.$parent.posts = result.data.data.map((val) => val.name).reverse()

      this.fetchState = ''
      this.fetchState = false
    },
    removeImage(idx: number) {
      this.images = this.images.filter((image) => image.idx != idx)
    },
    changeLocState() {
      this.allowState.loc = !this.allowState.loc

      if (this.allowState.loc) {
        this.getPosition()
      } else {
        this.lat = ''
        this.lon = ''
      }
    }
  }
}

</script>