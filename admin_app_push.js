Momo.appPush = {
  msgList: [],
  appids: ['aries', 'taurus'],
  query: { 'appid': 'aries', 'type': 1, 'pageIndex': 1, 'pageSize': 25, 'totalPages': -1 },
  selectedId: -1,
  action: "",
  entryEdit: {},
  delId: "",
  entryDefault: { 'badge':1 },
  entryClipper: { 'valid': false },
  templateList: {
    msgList: null, pagination: null, editArea: null
  }
};
Momo.postInitUser = function() {
  Momo.appPush.bindEvent();
  Momo.appPush.initHtml();
  Momo.appPush.templateList.msgList = Tempo.prepare('msg_list');
  Momo.appPush.templateList.pagination = Tempo.prepare('pagination');
  Momo.appPush.templateList.editArea = Tempo.prepare('msg_add_container');
  Momo.appPush.doQuery();
  Momo.appPush.renderList();
};

Momo.appPush.initHtml= function() {
  var html = [];
  for (var i in Momo.appPush.appids) {
    var appid = Momo.appPush.appids[i];
    html.push('<option value="' + appid + '">' + appid + '</option>');
  }
  html = html.join('');
  // add appids for query title
  $('.div_title select[name=appid]').html(html);
  // add appids selection for editting or adding
  $('#msg_add_container select[name=appid]').html(html);
};

Momo.appPush.doQuery = function() {
  Momo.ajaxRequest('/api/admin_app_push', {
    'cmd': 'list',
    'appid': Momo.appPush.query['appid'],
    'type': Momo.appPush.query['type'],
    'pageindex': Momo.appPush.query['pageIndex'],
    'pagesize': Momo.appPush.query['pageSize']
  }, function (resp) {
    if (resp.err || resp.errStr) {
      window.alert(resp.err + ' ' + resp.errStr);
      return false;
    }
    Momo.appPush.query['totalPages'] = parseInt((resp.count + Momo.appPush.query['pageSize'] -1) / Momo.appPush.query['pageSize']);
    Momo.appPush.msgList = [];
    $.each(resp.push_list, function(i, msg) {
      Momo.appPush.msgList.push($.extend({
        '_id': '',
        'send_date': '',
        'paramKey1': '','paramValue1': '',
        'paramKey2': '', 'paramValue2': '',
        'paramKey3': '', 'paramValue3': '',
        'paramKey4': '', 'paramValue4': '',
        'paramKey5': '', 'paramValue5': '',
        'memo': '',
        'fuse_date': '',
        'title': '',
        'confirmText': '',
        'cancelText': '',
        'msgType': '',
        'imgId': '',
        'expire': '',
        'sended_number': ''
      }, msg));
      var param_list = [];
      // aries paramters
      if (msg['colorTheme']){
        param_list.push(['color', msg['colorTheme']]);
      }
      if (msg['url']){
        param_list.push(['url', msg['url']]);
      }

      // taurus paramters
      if (msg['key']){
        param_list.push(['key', msg['key']]);
      }
      if (msg['value']){
        param_list.push(['value', msg['value']]);
      }

      for (var k = 0; k < param_list.length; k++) {
        var entry = param_list[k];
        Momo.appPush.msgList[i]['paramKey' + (k + 1)] = entry[0];
        Momo.appPush.msgList[i]['paramValue' + (k + 1)] = entry[1];
      }
    });
  }, {
    async: false
  });
};

Momo.appPush.renderList = function() {
  // Process message list area
  var msgList = Momo.appPush.templateList.msgList;
  msgList.render(Momo.appPush.msgList);
  // Process pagination area
  var pagesData = [];
  var start = Math.max(Momo.appPush.query['pageIndex'] - 3, 1);
  var end = Math.min(Momo.appPush.query['pageIndex'] + 3, Momo.appPush.query['totalPages']);
  for (var x = start; x <= end; x++) {
    pagesData.push({page: x});
  }
  var paginationData = [{
    first: 1,
    previous: (Momo.appPush.query['pageIndex'] - 1),
    next: (Momo.appPush.query['pageIndex'] + 1),
    last: (Momo.appPush.query['totalPages']),
    pages: pagesData
  }];
  var pagination = Momo.appPush.templateList.pagination;
  pagination.render(paginationData);
  if (Momo.appPush.query['pageIndex'] === 1) {
    $('#pagination .first_page').removeClass('active_page_li').addClass('inactive_page_li');
    $('#pagination .previous_page').removeClass('active_page_li').addClass('inactive_page_li');
  }
  if (Momo.appPush.query['pageIndex'] === Momo.appPush.query['totalPages']) {
    $('#pagination .next_page').removeClass('active_page_li').addClass('inactive_page_li');
    $('#pagination .last_page').removeClass('active_page_li').addClass('inactive_page_li');
  }
  $("#pagination .middle_pages[p='" + Momo.appPush.query['pageIndex'] + "']").removeClass('active_page_li').addClass('force_page_li');
};

// add or edit
Momo.appPush.addOrUpdate = function() {
  var data = $.extend({ 'cmd': 'edit' }, Momo.appPush.entryEdit);
  Momo.ajaxRequest('/api/admin_app_push', data, function (resp) {
    if (resp.err || resp.errStr) {
      window.alert(resp.err + ' ' + resp.errStr);
      return false;
    }
    $(".promptMessageGlass").hide();
    window.alert('操作成功');
    Momo.appPush.doQuery();
    Momo.appPush.renderList();
    return false;
  }, {
    async: false
  });
};

// delete
Momo.appPush.del = function() {
  var data = { 'cmd': 'del', '_id': Momo.appPush.delId};
  Momo.ajaxRequest('/api/admin_app_push', data, function (resp) {
    if (resp.err || resp.errStr) {
      window.alert(resp.err + ' ' + resp.errStr);
      return false;
    }
    window.alert('删除成功');
    Momo.appPush.doQuery();
    Momo.appPush.renderList();
    return false;
  }, {
    async: false
  });
};

// 添加
Momo.appPush.copy = function(entry) {
  Momo.appPush.entryClipper = $.extend(true, {}, entry);
  Momo.appPush.entryClipper['valid'] = false;
};

// get entry from entry list
Momo.appPush.get_entry_from_list = function(id) {
  for (index in Momo.appPush.msgList) {
    var entry = Momo.appPush.msgList[index];
    if (entry['_id'] == id) {
      return entry;
    }
  }
  return false;
};

Momo.appPush.bindEvent = function() {
  // body
  $("body").unbind("keyup").bind("keyup", function(e) {
    e = e || window.event;
    if ((e.which ? e.which : e.keyCode) == 27) {  // Esc pressed
      if (!($('.promptMessageGlass').is(":hidden")) && window.confirm("确实要放弃修改吗？")) {
        $(".promptMessageGlass").hide();
        return false;
      }
    }
  });
  // 应用选择
  $('.div_title select[name=appid]').change(function() {
    Momo.appPush.query['appid'] = $(this).val();
    Momo.appPush.doQuery();
    Momo.appPush.renderList();
  });
  // 未发送 / 已发送 radio
  $('.span_title [name="show"]').change(function(){
    Momo.appPush.query['type'] = $(this).val();
    Momo.appPush.doQuery();
    Momo.appPush.renderList();
  });
  // 添加
  $('.btn_add').click(function(){
    Momo.appPush.initAddData();
  });
  // 修改
  $('.btn_unsend_edit').live('click', function() {
    Momo.appPush.copy(Momo.appPush.get_entry_from_list($(this).attr('_id')));
    Momo.appPush.entryClipper['valid'] = true;
    Momo.appPush.initAddData();
  });
  // 删除
  $('.btn_unsend_delete').live('click', function() {
    Momo.appPush.delId = $.trim($(this).attr('_id'));
    if (!Momo.appPush.delId) {
      window.alert('无效ID!');
      return false;
    }
    if (window.confirm('确认删除?')) {
      Momo.appPush.del();
    }
  });
  // 复制
  $('.btn_sended_copy').live('click', function() {
    Momo.appPush.copy(Momo.appPush.get_entry_from_list($(this).attr('_id')));
    // remove the cloned property '_id' of the sended push msg
    delete Momo.appPush.entryClipper['_id'];
    delete Momo.appPush.entryClipper['memo'];
    Momo.appPush.entryClipper['valid'] = true;
    window.alert('复制成功');
    return false;
  });
  // 保存
  $('.id_save_btn').live('click', function() {
    // get message
    Momo.appPush.get_edit_info();
    if (!Momo.appPush.entryEdit['msg'] || !Momo.appPush.entryEdit['msg_type']) {
      window.alert('请输入正确的信息');
      return false;
    }
    Momo.appPush.addOrUpdate();
  });
  // 图片id
  $('.id_check_img').live('click', function() {
    var a = $(this).prev();
    var id = $.trim(a.val());
    $('.id_msg_img').attr('src', ('http://www.sugarlady.com/api/fqimage' + id));
  });
  // bind pagination link
  $('.dv_pagination .active_page_li').live('mouseenter mouseleave', function() {
    $(this).toggleClass('force_page_li');
  });
  $('.dv_pagination .active_page_li').live('click', function() {
    Momo.appPush.query['pageIndex'] = parseInt($(this).attr('p'));
    Momo.appPush.doQuery();
    Momo.appPush.renderList();
  });

  // bind pagination
  $('.dv_pagination button').live('click', function() {
    var page = parseInt($(this).prev().val());
    if (page < 1 || page > Momo.appPush.query['totalPages'] || page == Momo.appPush.query['pageIndex']) {
      $(this).prev().select();
      window.alert('亲，请输入正确页码');
      return false;
    }
    Momo.appPush.query['pageIndex'] = page;
    Momo.appPush.doQuery();
    Momo.appPush.renderList();
  });
  /* span close */
  $('.promptbox .span_close').live('click', function() {
    $(".promptMessageGlass").hide();
    return false;
  });

  /* bind parameter selection event when editting or adding push content */
  $('.promptbox .id_key1').live('change', function() {
    var type = Momo.appPush.query['appid'];
    var value = $(this).val();
    if ($.inArray(value, ['url', 'color']) != -1) {
      $("#msg_add_container .id_value1").val("");
      $("#msg_add_container .id_key2").val("");
      $("#msg_add_container .id_value2").val("");

      if (value == 'color'){
        $("#msg_add_container .id_value1").val("1");
      } else {
        $("#msg_add_container .id_value1").select();
      }
      type = 'aries';
    } else if ($.inArray(value, ['wp', 'as']) != -1) {
      $("#msg_add_container .id_value1").val(value);
      $("#msg_add_container .id_key2").val("value");
      $("#msg_add_container .id_value2").select();
      type = 'taurus';
    } else {
      $("#msg_add_container .id_value1").val("");
      $("#msg_add_container .id_key2").val("");
      $("#msg_add_container .id_value2").val("");
    }
    $('.promptbox .id_appid').val(type);
  });
};

/* add */
Momo.appPush.initAddData = function(){
  var entry = $.extend(true, {}, Momo.appPush.entryDefault);
  entry['appid'] = $('.div_title select[name=appid]').val();
  if (Momo.appPush.entryClipper['valid']) {
    entry = $.extend(true, {}, Momo.appPush.entryClipper);
    Momo.appPush.entryClipper['valid'] = false;
  }
  var editArea = Momo.appPush.templateList.editArea;
  editArea.render([entry]);
  if (entry['appid'] == 'taurus'){
    if (entry['paramKey1']) {
      $('.promptbox .id_key1').val(entry['paramValue1']);
    }
  }else if (entry['appid'] == 'aries'){
    if (entry['paramKey1']) {
      $('.promptbox .id_key1').val(entry['paramKey1']);
    }
  }
  if (entry['audience']) {
    $('.promptbox .id_audience').val(entry['audience']);
  }
  if (entry['appid']) {
    $('#msg_add_container .id_appid').val(entry['appid']);
  }
  // 加载消息接收类型
  if (entry['msgType']) {
    $('#msg_add_container .id_msg_type').val(entry['msgType'])
  }
  // 加载设定发送时间
  if (entry['fuse_date']) {
    $('#msg_add_container .id_fuse_date').val(entry['fuse_date']);
  } else {
    $('#msg_add_container .id_fuse_date').val('');
  }
  // use to specified edit or add
  if (entry['_id']) {
    $('.promptbox .id_save_btn').attr('_id', entry['_id']);
  } else {
    $('.promptbox .id_save_btn').removeAttr('_id');
  }
  $(".promptMessageGlass").height($(".frm_right_top").outerHeight(true) + $(".frm_right_content").outerHeight(true)).show();
};

/* get edited info */
Momo.appPush.get_edit_info = function() {
  var container = $('.promptbox');
  Momo.appPush.entryEdit = {};
  // id
  var _id = $.trim(container.find('.id_save_btn').attr('_id'));
  if (_id) {
    Momo.appPush.entryEdit['_id'] = _id;
  }
  // msg
  var msg = $.trim(container.find('.id_msg').val());
  Momo.appPush.entryEdit['msg'] = msg;
  // badge
  var badge = $.trim(container.find('.id_badge').val());
  Momo.appPush.entryEdit['badge'] = badge;
  // param and value
  var keys = [], values = [];
  for (var i = 1; i <= 5; i++) {
    var key = $.trim(container.find('.id_key' + i).val());
    var value = $.trim(container.find('.id_value' + i).val());
    if (key && value) {
      keys.push(key);
      values.push(value);
    }
  }
  // aries parameters
  if ($.inArray('color', keys) != -1) {
    Momo.appPush.entryEdit['color'] = values[$.inArray('color', keys)];
  }
  if ($.inArray('url', keys) != -1) {
    Momo.appPush.entryEdit['url'] = values[$.inArray('url', keys)];
  }
  // taurus parameters
  if (($.inArray('wp', keys) != -1) && ($.inArray('value', keys) != -1)) {
    Momo.appPush.entryEdit['wp'] = values[$.inArray('value', keys)];
  }
  if (($.inArray('as', keys) != -1) && ($.inArray('value', keys) != -1)) {
    Momo.appPush.entryEdit['as'] = values[$.inArray('value', keys)];
  }

  Momo.appPush.entryEdit['audience'] = $.trim(container.find('.id_audience').val());
  Momo.appPush.entryEdit['appid'] = $.trim(container.find('.id_appid').val());
  var fuse_date = $.trim(container.find('.id_fuse_date').val());
  // TODO(yuan.wu) check the formate of the fuse_date YYYY-mm-dd HH:MM
  if (fuse_date) {
    Momo.appPush.entryEdit['fuse_date'] =  fuse_date;
  }
  // title
  Momo.appPush.entryEdit['title'] = $.trim(container.find('.id_title').val());
  // btn_ok
  Momo.appPush.entryEdit['btn_ok'] = $.trim(container.find('.id_btn_ok').val());
  // btn_cancel
  Momo.appPush.entryEdit['btn_cancel'] = $.trim(container.find('.id_btn_cancel').val());
  // msg_type
  Momo.appPush.entryEdit['msg_type'] = $.trim(container.find('.id_msg_type').val());
  // img_id
  var img_id = $.trim(container.find('.id_img_id').val());
  if (img_id) {
    Momo.appPush.entryEdit['img_id'] = img_id;
  }
  // expire
  Momo.appPush.entryEdit['expire'] = $.trim(container.find('.id_expire').val());
};
